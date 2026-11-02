export type ExamKind = "ip" | "fe" | "ap" | "db";

export type FieldKind = "strategy" | "management" | "technology" | "advanced";

export type ChoiceKey = "ア" | "イ" | "ウ" | "エ";

export const CHOICE_KEYS: ChoiceKey[] = ["ア", "イ", "ウ", "エ"];

export type QuestionKind = "mcq" | "multi" | "essay";

export type PartType = "choice" | "fill" | "essay" | "calc";

export interface McqQuestion {
  id: string;
  kind: "mcq";
  exam: ExamKind;
  year: string;
  field: FieldKind;
  category: string;
  stem: string;
  choices: [string, string, string, string];
  answer: 0 | 1 | 2 | 3;
  explanation: string;
}

export interface BlankSpec {
  id: string;
  label: string;
  prompt?: string;
  choices: string[];
  answer: number;
  explanation: string;
}

export interface MultiQuestion {
  id: string;
  kind: "multi";
  exam: ExamKind;
  year: string;
  field: FieldKind;
  category: string;
  title: string;
  passage?: string;
  code?: string;
  stem: string;
  blanks: BlankSpec[];
  explanation: string;
}

export interface EssayPart {
  id: string;
  label: string;
  prompt: string;
  type: PartType;
  choices?: string[];
  answer: string;
  maxPoints: number;
  rubric: string;
  explanation: string;
}

export interface EssayQuestion {
  id: string;
  kind: "essay";
  exam: ExamKind;
  year: string;
  field: FieldKind;
  category: string;
  title: string;
  passage: string;
  required?: boolean;
  parts: EssayPart[];
}

export type Question = McqQuestion | MultiQuestion | EssayQuestion;

export type AnswerValue =
  | number
  | string
  | Record<string, number | string | null>
  | null;

export interface PhaseDef {
  key: string;
  label: string;
  durationMin: number;
  questionCount: number;
  scoredCount: number;
  maxScore: number;
  passScore: number;
  format: "mcq" | "multi" | "essay";
  selectable?: { total: number; pick: number; requiredIds?: string[] };
}

export interface SessionDef {
  key: string;
  label: string;
  years: string[];
}

export interface ExamDef {
  kind: ExamKind;
  name: string;
  short: string;
  official: string;
  blurb: string;
  sessions: SessionDef[];
  phases: PhaseDef[];
  fieldMix?: Partial<Record<FieldKind, number>>;
}

export interface AttemptScore {
  phase: string;
  rawCorrect: number;
  rawTotal: number;
  scaled: number;
  passed: boolean;
}

export interface AttemptRow {
  id: string;
  userId: string;
  examKind: ExamKind;
  sessionKey: string;
  status: "in_progress" | "completed";
  currentPhase: string;
  startedAt: string;
  finishedAt: string | null;
  phaseStartedAt: string;
  questionIds: string[];
  scoredIds: string[];
  selectedIds: string[];
  scores: AttemptScore[];
  passed: boolean | null;
  createdAt: string;
}

export interface AnswerRow {
  questionId: string;
  phase: string;
  answer: AnswerValue;
  flagged: boolean;
  isCorrect: boolean | null;
  earned: number | null;
  maxPoints: number | null;
  aiFeedback: string | null;
}
