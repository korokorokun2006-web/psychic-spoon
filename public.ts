import type { EssayQuestion, McqQuestion, MultiQuestion, Question } from "./types";

export type PublicMcq = Omit<McqQuestion, "answer" | "explanation">;
export type PublicBlank = Omit<import("./types").BlankSpec, "answer" | "explanation">;
export type PublicMulti = Omit<MultiQuestion, "blanks" | "explanation"> & {
  blanks: PublicBlank[];
};
export type PublicEssayPart = Omit<
  import("./types").EssayPart,
  "answer" | "rubric" | "explanation"
>;
export type PublicEssay = Omit<EssayQuestion, "parts"> & { parts: PublicEssayPart[] };
export type PublicQuestion = PublicMcq | PublicMulti | PublicEssay;

export function stripQuestion(q: Question): PublicQuestion {
  if (q.kind === "mcq") {
    const { answer: _a, explanation: _e, ...rest } = q;
    return rest;
  }
  if (q.kind === "multi") {
    const { explanation: _e, ...rest } = q;
    return {
      ...rest,
      blanks: q.blanks.map(({ answer: _a, explanation: _x, ...b }) => b),
    };
  }
  return {
    ...q,
    parts: q.parts.map(({ answer: _a, rubric: _r, explanation: _e, ...p }) => p),
  };
}

export function stripMany(questions: Question[]): PublicQuestion[] {
  return questions.map(stripQuestion);
}
