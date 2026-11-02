import type { ExamKind, Question } from "./types";

const modules = import.meta.glob("./data/*.json", {
  eager: true,
  import: "default",
}) as Record<string, Question[]>;

let cache: Question[] | null = null;
let byId: Map<string, Question> | null = null;

function allQuestions(): Question[] {
  if (cache) return cache;
  const acc: Question[] = [];
  for (const list of Object.values(modules)) {
    if (Array.isArray(list)) acc.push(...list);
  }
  cache = acc;
  return acc;
}

export function getQuestionMap(): Map<string, Question> {
  if (byId) return byId;
  byId = new Map(allQuestions().map((q) => [q.id, q]));
  return byId;
}

export function getPhaseQuestions(kind: ExamKind, years: string[], phase: string): Question[] {
  return allQuestions().filter(
    (q) => q.exam === kind && years.includes(q.year) && phaseOf(q) === phase,
  );
}

function phaseOf(q: Question): string {
  // id: exam-year-phase-nnn  (year may contain hyphens: r8-autumn)
  const parts = q.id.split("-");
  if (q.exam === "ip") return "ip";
  if (q.exam === "fe") return parts[2] ?? q.kind;
  if (q.exam === "ap") return parts[3] ?? (q.kind === "mcq" ? "a" : "b");
  if (q.exam === "db") {
    // db-r8-autumn-a1-001
    const p = parts[3];
    if (p === "a1" || p === "a2" || p === "b1" || p === "b2") return p;
  }
  return "a";
}
