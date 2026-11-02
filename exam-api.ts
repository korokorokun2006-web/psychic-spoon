import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { EXAMS, getExam, getSession, nextPhase } from "@/lib/exams/catalog";
import type {
  AnswerValue,
  AttemptRow,
  AttemptScore,
  EssayQuestion,
  ExamKind,
  Question,
} from "@/lib/exams/types";
import { gradeMcq, gradeMulti, keywordScore, maxEssayPoints, phaseResult } from "@/lib/exams/scoring";
import { stripMany, type PublicQuestion } from "@/lib/exams/public";

type AttemptDb = {
  id: string;
  user_id: string;
  exam_kind: ExamKind;
  session_key: string;
  status: "in_progress" | "completed";
  current_phase: string;
  started_at: string;
  finished_at: string | null;
  phase_started_at: string;
  question_ids: unknown;
  scored_ids: unknown;
  selected_ids: unknown;
  scores: unknown;
  papers: unknown;
  passed: boolean | null;
  created_at: string;
};

type AnswerDb = {
  question_id: string;
  phase: string;
  answer: unknown;
  flagged: boolean;
  is_correct: boolean | null;
  earned: number | null;
  max_points: number | null;
  ai_feedback: string | null;
};

function parseJson<T>(v: unknown, fallback: T): T {
  if (v == null) return fallback;
  if (typeof v === "string") {
    try {
      return JSON.parse(v) as T;
    } catch {
      return fallback;
    }
  }
  return v as T;
}

function mapAttempt(row: AttemptDb): AttemptRow & { papers: Record<string, string[]> } {
  return {
    id: row.id,
    userId: row.user_id,
    examKind: row.exam_kind,
    sessionKey: row.session_key,
    status: row.status,
    currentPhase: row.current_phase,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    phaseStartedAt: row.phase_started_at,
    questionIds: parseJson<string[]>(row.question_ids, []),
    scoredIds: parseJson<string[]>(row.scored_ids, []),
    selectedIds: parseJson<string[]>(row.selected_ids, []),
    scores: parseJson<AttemptScore[]>(row.scores, []),
    passed: row.passed,
    createdAt: row.created_at,
    papers: parseJson<Record<string, string[]>>(row.papers, {}),
  };
}

async function loadAttempt(sql: Awaited<ReturnType<typeof getSql>>, id: string, userId: string) {
  const rows = await sql<AttemptDb>`
    select * from exam_attempts where id = ${id} and user_id = ${userId} limit 1
  `;
  const row = rows[0];
  if (!row) throw new Error("受験記録が見つかりません");
  return mapAttempt(row);
}

async function loadAnswers(sql: Awaited<ReturnType<typeof getSql>>, attemptId: string, userId: string) {
  return sql<AnswerDb>`
    select question_id, phase, answer, flagged, is_correct, earned, max_points, ai_feedback
    from exam_answers where attempt_id = ${attemptId} and user_id = ${userId}
  `;
}

export const startAttempt = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { kind: ExamKind; sessionKey: string }) => input)
  .handler(async ({ context, data }) => {
    const exam = getExam(data.kind);
    const session = exam ? getSession(data.kind, data.sessionKey) : undefined;
    if (!exam || !session) throw new Error("試験区分または実施回が不正です");
    const { assemblePapers, questionsByIds } = await import("@/lib/exams/assemble");
    const assembled = assemblePapers(data.kind, data.sessionKey, `${context.userId}:${Date.now()}`);
    const first = exam.phases[0]!;
    const qids = assembled.papers[first.key] ?? [];
    const scored = assembled.scored[first.key] ?? [];
    const id = crypto.randomUUID();
    const sql = await getSql();
    await sql`
      insert into exam_attempts (
        id, user_id, exam_kind, session_key, status, current_phase,
        question_ids, scored_ids, selected_ids, scores, papers
      ) values (
        ${id}, ${context.userId}, ${data.kind}, ${data.sessionKey}, 'in_progress', ${first.key},
        ${JSON.stringify(qids)}::jsonb, ${JSON.stringify(scored)}::jsonb,
        ${JSON.stringify([])}::jsonb, ${JSON.stringify([])}::jsonb,
        ${JSON.stringify(assembled.papers)}::jsonb
      )
    `;
    const questions = stripMany(questionsByIds(qids));
    const attempt = await loadAttempt(sql, id, context.userId);
    return { attempt, questions };
  });

export const getAttempt = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: { attemptId: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const attempt = await loadAttempt(sql, data.attemptId, context.userId);
    const { questionsByIds } = await import("@/lib/exams/assemble");
    const questions = stripMany(questionsByIds(attempt.questionIds));
    const answers = await loadAnswers(sql, attempt.id, context.userId);
    const exam = EXAMS[attempt.examKind];
    const phase = exam.phases.find((p) => p.key === attempt.currentPhase) ?? exam.phases[0]!;
    const phaseSelected = attempt.selectedIds.filter((id) =>
      (attempt.papers[attempt.currentPhase] ?? []).includes(id),
    );
    const needsSelect = Boolean(phase.selectable) && phaseSelected.length < (phase.selectable?.pick ?? 0);
    return {
      attempt,
      questions,
      answers: answers.map((a) => ({
        questionId: a.question_id,
        phase: a.phase,
        answer: parseJson<AnswerValue>(a.answer, null),
        flagged: a.flagged,
      })),
      needsSelect,
      exam,
      phase,
      reveal: false as const,
    };
  });

export const listAttempts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<AttemptDb>`
      select * from exam_attempts where user_id = ${context.userId}
      order by created_at desc limit 80
    `;
    return rows.map(mapAttempt);
  });

export const saveAnswer = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: {
      attemptId: string;
      questionId: string;
      answer: AnswerValue;
      flagged?: boolean;
    }) => input,
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const attempt = await loadAttempt(sql, data.attemptId, context.userId);
    if (attempt.status !== "in_progress") throw new Error("終了した試験は変更できません");
    if (!attempt.questionIds.includes(data.questionId)) throw new Error("この問題は受験対象外です");
    await sql`
      insert into exam_answers (attempt_id, user_id, question_id, phase, answer, flagged)
      values (
        ${attempt.id}, ${context.userId}, ${data.questionId}, ${attempt.currentPhase},
        ${JSON.stringify(data.answer)}::jsonb, ${data.flagged ?? false}
      )
      on conflict (attempt_id, question_id) do update set
        answer = excluded.answer,
        flagged = excluded.flagged,
        updated_at = now()
    `;
    return { ok: true as const };
  });

export const saveAnswers = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: {
      attemptId: string;
      items: { questionId: string; answer: AnswerValue; flagged?: boolean }[];
    }) => input,
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const attempt = await loadAttempt(sql, data.attemptId, context.userId);
    if (attempt.status !== "in_progress") throw new Error("終了した試験は変更できません");
    const allowed = new Set(attempt.questionIds);
    for (const item of data.items) {
      if (!allowed.has(item.questionId)) continue;
      await sql`
        insert into exam_answers (attempt_id, user_id, question_id, phase, answer, flagged)
        values (
          ${attempt.id}, ${context.userId}, ${item.questionId}, ${attempt.currentPhase},
          ${JSON.stringify(item.answer)}::jsonb, ${item.flagged ?? false}
        )
        on conflict (attempt_id, question_id) do update set
          answer = excluded.answer,
          flagged = excluded.flagged,
          updated_at = now()
      `;
    }
    return { ok: true as const };
  });

export const confirmSelection = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { attemptId: string; selectedIds: string[] }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const attempt = await loadAttempt(sql, data.attemptId, context.userId);
    const exam = EXAMS[attempt.examKind];
    const phase = exam.phases.find((p) => p.key === attempt.currentPhase);
    if (!phase?.selectable) throw new Error("この科目に選択はありません");
    const candidates = attempt.papers[phase.key] ?? [];
    const selected = data.selectedIds.filter((id) => candidates.includes(id));
    const required = candidates.filter((id) =>
      (phase.selectable?.requiredIds ?? []).some((r) => id.endsWith(`-${r}`) || id.endsWith(r)),
    );
    for (const r of required) {
      if (!selected.includes(r)) throw new Error("必須問題を含めてください");
    }
    if (selected.length !== phase.selectable.pick) {
      throw new Error(`${phase.selectable.pick}問を選択してください`);
    }
    const selectedIds = [
      ...attempt.selectedIds.filter((id) => !candidates.includes(id)),
      ...selected,
    ];
    const scoredAll = [
      ...parseJson<string[]>(
        (await sql<AttemptDb>`select scored_ids from exam_attempts where id = ${attempt.id}`)[0]
          ?.scored_ids,
        attempt.scoredIds,
      ).filter((id) => !candidates.includes(id)),
      ...selected,
    ];
    await sql`
      update exam_attempts set
        selected_ids = ${JSON.stringify(selectedIds)}::jsonb,
        question_ids = ${JSON.stringify(selected)}::jsonb,
        scored_ids = ${JSON.stringify(scoredAll)}::jsonb,
        phase_started_at = now()
      where id = ${attempt.id} and user_id = ${context.userId}
    `;
    const { questionsByIds } = await import("@/lib/exams/assemble");
    return { questions: stripMany(questionsByIds(selected)), selectedIds };
  });

export const submitPhase = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { attemptId: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const attempt = await loadAttempt(sql, data.attemptId, context.userId);
    if (attempt.status !== "in_progress") throw new Error("既に終了しています");
    const exam = EXAMS[attempt.examKind];
    const phase = exam.phases.find((p) => p.key === attempt.currentPhase);
    if (!phase) throw new Error("科目が見つかりません");

    const { questionsByIds } = await import("@/lib/exams/assemble");
    const qs = questionsByIds(attempt.questionIds);
    const answerRows = await loadAnswers(sql, attempt.id, context.userId);
    const ansMap = new Map(answerRows.map((a) => [a.question_id, parseJson<AnswerValue>(a.answer, null)]));

    const scoredSet = new Set(
      attempt.scoredIds.length ? attempt.scoredIds : attempt.questionIds,
    );
    const score = await gradePhase(qs, ansMap, scoredSet, phase.maxScore, phase.passScore, phase.key);

    for (const q of qs) {
      const g = score.perQuestion[q.id];
      if (!g) continue;
      await sql`
        insert into exam_answers (attempt_id, user_id, question_id, phase, answer, is_correct, earned, max_points, ai_feedback)
        values (
          ${attempt.id}, ${context.userId}, ${q.id}, ${phase.key},
          ${JSON.stringify(ansMap.get(q.id) ?? null)}::jsonb,
          ${g.correct}, ${g.earned}, ${g.max}, ${g.feedback}
        )
        on conflict (attempt_id, question_id) do update set
          is_correct = excluded.is_correct,
          earned = excluded.earned,
          max_points = excluded.max_points,
          ai_feedback = excluded.ai_feedback,
          updated_at = now()
      `;
    }

    const scores = [...attempt.scores.filter((s) => s.phase !== phase.key), score.summary];
    const nxt = nextPhase(attempt.examKind, phase.key);
    if (!nxt) {
      const passed = scores.every((s) => s.passed);
      await sql`
        update exam_attempts set
          status = 'completed', finished_at = now(), scores = ${JSON.stringify(scores)}::jsonb,
          passed = ${passed}
        where id = ${attempt.id} and user_id = ${context.userId}
      `;
      return { done: true as const, nextPhase: null, scores, passed };
    }

    const nextIds = attempt.papers[nxt.key] ?? [];
    let scoredIds = attempt.scoredIds;
    if (!nxt.selectable) {
      const { hashString, pickN, seededRandom } = await import("@/lib/utils");
      const rand = seededRandom(hashString(`${attempt.id}:${nxt.key}`));
      scoredIds = unique([...scoredIds, ...pickN(nextIds, nxt.scoredCount, rand)]);
    }

    await sql`
      update exam_attempts set
        current_phase = ${nxt.key},
        phase_started_at = now(),
        question_ids = ${JSON.stringify(nextIds)}::jsonb,
        scored_ids = ${JSON.stringify(scoredIds)}::jsonb,
        scores = ${JSON.stringify(scores)}::jsonb
      where id = ${attempt.id} and user_id = ${context.userId}
    `;
    return { done: false as const, nextPhase: nxt.key, scores, passed: null };
  });

export const getResult = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: { attemptId: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const attempt = await loadAttempt(sql, data.attemptId, context.userId);
    if (attempt.status !== "completed") throw new Error("まだ採点結果を表示できません");
    const { questionsByIds } = await import("@/lib/exams/assemble");
    const allIds = unique(Object.values(attempt.papers).flat());
    const questions = questionsByIds(allIds);
    const answers = await loadAnswers(sql, attempt.id, context.userId);
    return {
      attempt,
      exam: EXAMS[attempt.examKind],
      questions,
      answers: answers.map((a) => ({
        questionId: a.question_id,
        phase: a.phase,
        answer: parseJson<AnswerValue>(a.answer, null),
        flagged: a.flagged,
        isCorrect: a.is_correct,
        earned: a.earned,
        maxPoints: a.max_points,
        aiFeedback: a.ai_feedback,
      })),
    };
  });

function unique(ids: string[]): string[] {
  return [...new Set(ids)];
}

async function gradePhase(
  qs: Question[],
  ansMap: Map<string, AnswerValue>,
  scoredSet: Set<string>,
  maxScore: number,
  passScore: number,
  phaseKey: string,
) {
  const perQuestion: Record<string, { correct: boolean; earned: number; max: number; feedback: string | null }> =
    {};
  let rawCorrect = 0;
  let rawTotal = 0;

  const graded = await Promise.all(
    qs.map(async (q) => {
      const user = ansMap.get(q.id) ?? null;
      if (q.kind === "mcq") {
        const g = gradeMcq(q, user);
        return [q.id, { ...g, feedback: null as string | null }] as const;
      }
      if (q.kind === "multi") {
        const g = gradeMulti(q, user);
        return [q.id, { correct: g.correct, earned: g.earned, max: g.max, feedback: null }] as const;
      }
      const g = await gradeEssayQuestion(q, user);
      return [q.id, g] as const;
    }),
  );

  for (const [id, g] of graded) {
    perQuestion[id] = g;
    if (scoredSet.has(id) && g.max > 0) {
      rawTotal += 1;
      rawCorrect += g.earned / g.max;
    }
  }

  return {
    summary: phaseResult(phaseKey, rawCorrect, rawTotal, maxScore, passScore),
    perQuestion,
  };
}

async function gradeEssayQuestion(q: EssayQuestion, user: AnswerValue) {
  const map = isRecord(user) ? user : {};
  const api = await tryAiGrade(q, map);
  if (api) return api;
  let earned = 0;
  let max = 0;
  const notes: string[] = [];
  for (const p of q.parts) {
    max += p.maxPoints;
    const ua = String(map[p.id] ?? "");
    if (p.type === "choice") {
      const correct = ua.trim() === p.answer.trim() || ua.trim().startsWith(p.answer.trim());
      const e = correct ? p.maxPoints : 0;
      earned += e;
      notes.push(`${p.label}: ${correct ? "正" : "誤"}`);
    } else {
      const e = keywordScore(ua, p.answer, p.rubric, p.maxPoints);
      earned += e;
      notes.push(`${p.label}: ${e}/${p.maxPoints}（自動採点）`);
    }
  }
  return {
    correct: earned >= max * 0.6,
    earned,
    max: max || maxEssayPoints(q),
    feedback: notes.join(" / "),
  };
}

async function tryAiGrade(q: EssayQuestion, map: Record<string, unknown>) {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return null;
  const payload = q.parts.map((p) => ({
    id: p.id,
    label: p.label,
    prompt: p.prompt,
    modelAnswer: p.answer,
    rubric: p.rubric,
    maxPoints: p.maxPoints,
    user: String(map[p.id] ?? ""),
  }));
  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(12_000),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 900,
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "あなたは情報処理技術者試験の採点官です。各設問について 0〜maxPoints の整数点と短い講評をJSONで返してください。形式: {\"parts\":[{\"id\":\"a1\",\"earned\":0,\"comment\":\"...\"}],\"summary\":\"...\"} のみ。",
          },
          {
            role: "user",
            content: JSON.stringify({ title: q.title, parts: payload }),
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { choices: { message: { content: string } }[] };
    const text = body.choices[0]?.message.content ?? "";
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart < 0) return null;
    const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as {
      parts: { id: string; earned: number; comment: string }[];
      summary: string;
    };
    let earned = 0;
    let max = 0;
    for (const p of q.parts) {
      max += p.maxPoints;
      const row = parsed.parts.find((x) => x.id === p.id);
      const e = Math.max(0, Math.min(p.maxPoints, Math.round(row?.earned ?? 0)));
      earned += e;
    }
    return {
      correct: earned >= max * 0.6,
      earned,
      max,
      feedback: parsed.summary ?? "AI採点",
    };
  } catch {
    return null;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export type { PublicQuestion };
