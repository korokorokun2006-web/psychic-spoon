import { EXAMS, getSession } from "./catalog";
import { getPhaseQuestions, getQuestionMap } from "./banks.server";
import type { ExamKind, FieldKind, Question } from "./types";
import { hashString, pickN, seededRandom, shuffle } from "@/lib/utils";

export function assemblePapers(
  kind: ExamKind,
  sessionKey: string,
  seed: string,
): { papers: Record<string, string[]>; scored: Record<string, string[]> } {
  const exam = EXAMS[kind];
  const session = getSession(kind, sessionKey);
  if (!session) throw new Error("unknown session");
  const rand = seededRandom(hashString(`${seed}:${kind}:${sessionKey}`));
  const papers: Record<string, string[]> = {};
  const scored: Record<string, string[]> = {};

  for (const phase of exam.phases) {
    const pool = getPhaseQuestions(kind, session.years, phase.key);
    if (phase.selectable) {
      const mixed = sessionKey === "random" ? mixSelectable(pool, phase.selectable.total, rand) : pool;
      const ordered = orderSelectable(mixed, phase.selectable.requiredIds);
      if (ordered.length < phase.selectable.total) {
        throw new Error(`${kind}/${phase.key} needs ${phase.selectable.total} candidates`);
      }
      papers[phase.key] = ordered.slice(0, phase.selectable.total).map((q) => q.id);
      scored[phase.key] = [];
      continue;
    }

    if (kind === "fe" && phase.key === "b") {
      const picked = pickByCategory(
        pool,
        {
          "擬似言語（基礎）": 4,
          "擬似言語（標準）": 4,
          "擬似言語（応用）": 4,
          "擬似言語（難問）": 4,
          セキュリティ: 4,
        },
        rand,
      );
      papers[phase.key] = picked.map((q) => q.id);
      scored[phase.key] = pickN(picked, phase.scoredCount, rand).map((q) => q.id);
      continue;
    }

    const picked = pickWithMix(pool, phase.questionCount, exam.fieldMix, rand);
    papers[phase.key] = picked.map((q) => q.id);
    scored[phase.key] = pickN(picked, phase.scoredCount, rand).map((q) => q.id);
  }

  return { papers, scored };
}

export function questionsByIds(ids: string[]): Question[] {
  const map = getQuestionMap();
  return ids.map((id) => {
    const q = map.get(id);
    if (!q) throw new Error(`missing question ${id}`);
    return q;
  });
}

function mixSelectable(pool: Question[], total: number, rand: () => number): Question[] {
  const byCat = new Map<string, Question[]>();
  for (const q of pool) {
    const list = byCat.get(q.category) ?? [];
    list.push(q);
    byCat.set(q.category, list);
  }
  const cats = [...byCat.keys()].sort();
  const picked: Question[] = [];
  for (const cat of cats) {
    const src = shuffle(byCat.get(cat) ?? [], rand);
    if (src[0]) picked.push(src[0]);
  }
  if (picked.length >= total) return picked.slice(0, total);
  for (const q of shuffle(pool, rand)) {
    if (picked.length >= total) break;
    if (!picked.includes(q)) picked.push(q);
  }
  return picked;
}

function orderSelectable(pool: Question[], requiredIds?: string[]): Question[] {
  if (!requiredIds?.length) return [...pool].sort((a, b) => a.id.localeCompare(b.id));
  const req = pool.filter(
    (q) =>
      (q.kind === "essay" && q.required) ||
      Boolean(requiredIds?.some((r) => q.id.endsWith(`-${r}`) || q.id.endsWith(r))),
  );
  const rest = pool.filter((q) => !req.includes(q));
  return [...req, ...rest];
}

function pickByCategory(
  pool: Question[],
  quotas: Record<string, number>,
  rand: () => number,
): Question[] {
  const byCat = new Map<string, Question[]>();
  for (const q of pool) {
    const list = byCat.get(q.category) ?? [];
    list.push(q);
    byCat.set(q.category, list);
  }
  const picked: Question[] = [];
  const used = new Set<string>();
  for (const [cat, n] of Object.entries(quotas)) {
    const src = shuffle(byCat.get(cat) ?? [], rand);
    let got = 0;
    for (const q of src) {
      if (got >= n) break;
      if (used.has(q.id)) continue;
      picked.push(q);
      used.add(q.id);
      got += 1;
    }
  }
  if (picked.length < Object.values(quotas).reduce((s, n) => s + n, 0)) {
    for (const q of shuffle(pool, rand)) {
      if (picked.length >= Object.values(quotas).reduce((s, n) => s + n, 0)) break;
      if (!used.has(q.id)) {
        picked.push(q);
        used.add(q.id);
      }
    }
  }
  return shuffle(picked, rand);
}

function pickWithMix(
  pool: Question[],
  count: number,
  mix: Partial<Record<FieldKind, number>> | undefined,
  rand: () => number,
): Question[] {
  if (!mix || Object.keys(mix).length === 0) {
    if (pool.length < count) {
      return shuffle(pool, rand).concat(shuffle(pool, rand)).slice(0, count);
    }
    return shuffle(pool, rand).slice(0, count);
  }

  const byField: Record<string, Question[]> = {};
  for (const q of pool) {
    (byField[q.field] ??= []).push(q);
  }
  const picked: Question[] = [];
  const used = new Set<string>();
  for (const [field, n] of Object.entries(mix)) {
    const src = shuffle(byField[field] ?? [], rand);
    for (const q of src) {
      if (picked.length >= count) break;
      if (used.has(q.id)) continue;
      picked.push(q);
      used.add(q.id);
      if (picked.filter((x) => x.field === field).length >= n) break;
    }
  }
  if (picked.length < count) {
    for (const q of shuffle(pool, rand)) {
      if (picked.length >= count) break;
      if (!used.has(q.id)) {
        picked.push(q);
        used.add(q.id);
      }
    }
  }
  while (picked.length < count && pool.length > 0) {
    picked.push(pool[picked.length % pool.length]!);
  }
  return shuffle(picked, rand).slice(0, count);
}
