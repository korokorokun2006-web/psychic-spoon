import type { AttemptScore, EssayQuestion, McqQuestion, MultiQuestion, Question } from "./types";

export function scaleScore(correct: number, total: number, max = 1000): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * max);
}

export function gradeMcq(question: McqQuestion, answer: unknown): { correct: boolean; earned: number; max: number } {
  const correct = answer === question.answer;
  return { correct, earned: correct ? 1 : 0, max: 1 };
}

export function gradeMulti(
  question: MultiQuestion,
  answer: unknown,
): { correct: boolean; earned: number; max: number; perBlank: Record<string, boolean> } {
  const map = isRecord(answer) ? answer : {};
  const perBlank: Record<string, boolean> = {};
  let earned = 0;
  for (const blank of question.blanks) {
    const ok = map[blank.id] === blank.answer;
    perBlank[blank.id] = ok;
    if (ok) earned += 1;
  }
  return {
    correct: earned === question.blanks.length,
    earned,
    max: question.blanks.length,
    perBlank,
  };
}

export function maxEssayPoints(question: EssayQuestion): number {
  return question.parts.reduce((s, p) => s + p.maxPoints, 0);
}

export function keywordScore(user: string, model: string, rubric: string, maxPoints: number): number {
  const text = normalize(user);
  if (!text) return 0;
  const pool = `${model} ${rubric}`;
  const keys = extractKeys(pool);
  if (keys.length === 0) {
    return text.length >= 8 ? Math.round(maxPoints * 0.4) : 0;
  }
  let hits = 0;
  for (const k of keys) {
    if (text.includes(k)) hits += 1;
  }
  const ratio = hits / keys.length;
  let score = Math.round(maxPoints * Math.min(1, ratio * 1.15));
  if (text.length < 6) score = Math.min(score, Math.ceil(maxPoints * 0.25));
  return Math.max(0, Math.min(maxPoints, score));
}

export function phaseResult(
  phase: string,
  rawCorrect: number,
  rawTotal: number,
  maxScore: number,
  passScore: number,
): AttemptScore {
  const scaled = scaleScore(rawCorrect, rawTotal, maxScore);
  return {
    phase,
    rawCorrect,
    rawTotal,
    scaled,
    passed: scaled >= passScore,
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function normalize(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase();
}

function extractKeys(source: string): string[] {
  const parts = source
    .split(/[\s、。．，；;：:・／/\n()（）「」『』【】\[\]{}<>]+/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 2 && !STOP.has(p));
  const uniq: string[] = [];
  for (const p of parts) {
    if (!uniq.includes(p) && uniq.length < 12) uniq.push(p);
  }
  return uniq;
}

const STOP = new Set([
  "こと",
  "ため",
  "もの",
  "これ",
  "それ",
  "ある",
  "する",
  "なる",
  "いる",
  "れる",
  "られる",
  "ます",
  "です",
  "した",
  "して",
  "され",
  "よう",
  "など",
  "また",
  "および",
  "または",
  "について",
  "により",
  "による",
  "として",
  "において",
  "に対し",
  "から",
  "まで",
  "場合",
  "とき",
  "設問",
  "解答",
  "正解",
  "解説",
  "観点",
  "内容",
]);
