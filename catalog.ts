import type { ExamDef, ExamKind } from "./types";

export const YEAR_LABEL: Record<string, string> = {
  r8: "令和8年度",
  r7: "令和7年度",
  r6: "令和6年度",
  r5: "令和5年度",
  r4: "令和4年度",
  "r8-spring": "令和8年度 春期",
  "r8-autumn": "令和8年度 秋期",
  "r7-spring": "令和7年度 春期",
  "r7-autumn": "令和7年度 秋期",
  "r6-spring": "令和6年度 春期",
  "r6-autumn": "令和6年度 秋期",
  "r5-spring": "令和5年度 春期",
  "r5-autumn": "令和5年度 秋期",
  "r4-spring": "令和4年度 春期",
  "r4-autumn": "令和4年度 秋期",
};

const IP_SESSIONS = [
  { key: "r8", label: "令和8年度", years: ["r8"] },
  { key: "r7", label: "令和7年度", years: ["r7"] },
  { key: "r6", label: "令和6年度", years: ["r6"] },
  { key: "r5", label: "令和5年度", years: ["r5"] },
  { key: "r4", label: "令和4年度", years: ["r4"] },
  { key: "random", label: "令和8〜4年度 ランダム", years: ["r8", "r7", "r6", "r5", "r4"] },
];

const FE_SESSIONS = IP_SESSIONS;

const AP_SESSIONS = [
  { key: "r8-autumn", label: "令和8年度 秋期", years: ["r8-autumn"] },
  { key: "r8-spring", label: "令和8年度 春期", years: ["r8-spring"] },
  { key: "r7-autumn", label: "令和7年度 秋期", years: ["r7-autumn"] },
  { key: "r7-spring", label: "令和7年度 春期", years: ["r7-spring"] },
  { key: "r6-autumn", label: "令和6年度 秋期", years: ["r6-autumn"] },
  { key: "r6-spring", label: "令和6年度 春期", years: ["r6-spring"] },
  { key: "r5-autumn", label: "令和5年度 秋期", years: ["r5-autumn"] },
  { key: "r5-spring", label: "令和5年度 春期", years: ["r5-spring"] },
  { key: "r4-autumn", label: "令和4年度 秋期", years: ["r4-autumn"] },
  { key: "r4-spring", label: "令和4年度 春期", years: ["r4-spring"] },
  {
    key: "random",
    label: "令和8〜4年度 ランダム",
    years: [
      "r8-autumn",
      "r8-spring",
      "r7-autumn",
      "r7-spring",
      "r6-autumn",
      "r6-spring",
      "r5-autumn",
      "r5-spring",
      "r4-autumn",
      "r4-spring",
    ],
  },
];

const DB_SESSIONS = [
  { key: "r8-autumn", label: "令和8年度 秋期", years: ["r8-autumn"] },
  { key: "r7-autumn", label: "令和7年度 秋期", years: ["r7-autumn"] },
  { key: "r6-autumn", label: "令和6年度 秋期", years: ["r6-autumn"] },
  { key: "r5-autumn", label: "令和5年度 秋期", years: ["r5-autumn"] },
  { key: "r4-autumn", label: "令和4年度 秋期", years: ["r4-autumn"] },
  {
    key: "random",
    label: "令和8〜4年度 ランダム",
    years: ["r8-autumn", "r7-autumn", "r6-autumn", "r5-autumn", "r4-autumn"],
  },
];

export const EXAMS: Record<ExamKind, ExamDef> = {
  ip: {
    kind: "ip",
    name: "ＩＴパスポート試験",
    short: "IP",
    official: "情報処理技術者試験",
    blurb: "ITを利活用するすべての社会人・学生向けの入門試験。ストラテジ・マネジメント・テクノロジをバランスよく出題します。",
    sessions: IP_SESSIONS,
    fieldMix: { strategy: 35, management: 20, technology: 45 },
    phases: [
      {
        key: "ip",
        label: "試験",
        durationMin: 120,
        questionCount: 100,
        scoredCount: 92,
        maxScore: 1000,
        passScore: 600,
        format: "mcq",
      },
    ],
  },
  fe: {
    kind: "fe",
    name: "基本情報技術者試験",
    short: "FE",
    official: "情報処理技術者試験",
    blurb: "ITエンジニアの登竜門。科目A（知識）と科目B（技能）を連続受験し、両方で600点以上が合格です。",
    sessions: FE_SESSIONS,
    fieldMix: { technology: 45, strategy: 10, management: 5 },
    phases: [
      {
        key: "a",
        label: "科目A",
        durationMin: 90,
        questionCount: 60,
        scoredCount: 56,
        maxScore: 1000,
        passScore: 600,
        format: "mcq",
      },
      {
        key: "b",
        label: "科目B",
        durationMin: 100,
        questionCount: 20,
        scoredCount: 19,
        maxScore: 1000,
        passScore: 600,
        format: "multi",
      },
    ],
  },
  ap: {
    kind: "ap",
    name: "応用情報技術者試験",
    short: "AP",
    official: "情報処理技術者試験",
    blurb: "高度な応用力を問う試験。科目Aは四肢択一、科目Bは長文事例の記述式。セキュリティは必須、他から4問を選択します。",
    sessions: AP_SESSIONS,
    fieldMix: { technology: 35, strategy: 20, management: 25 },
    phases: [
      {
        key: "a",
        label: "科目A",
        durationMin: 150,
        questionCount: 80,
        scoredCount: 80,
        maxScore: 1000,
        passScore: 600,
        format: "mcq",
      },
      {
        key: "b",
        label: "科目B",
        durationMin: 150,
        questionCount: 5,
        scoredCount: 5,
        maxScore: 1000,
        passScore: 600,
        format: "essay",
        selectable: { total: 11, pick: 5, requiredIds: ["01"] },
      },
    ],
  },
  db: {
    kind: "db",
    name: "データベーススペシャリスト試験",
    short: "DB",
    official: "情報処理技術者試験（高度）",
    blurb: "データ資源の設計・運用の専門家試験。午前I・IIと午後I・IIを連続受験し、全科目600点以上で合格です。",
    sessions: DB_SESSIONS,
    phases: [
      {
        key: "a1",
        label: "科目A-1（午前I）",
        durationMin: 50,
        questionCount: 30,
        scoredCount: 30,
        maxScore: 1000,
        passScore: 600,
        format: "mcq",
      },
      {
        key: "a2",
        label: "科目A-2（午前II）",
        durationMin: 40,
        questionCount: 25,
        scoredCount: 25,
        maxScore: 1000,
        passScore: 600,
        format: "mcq",
      },
      {
        key: "b1",
        label: "科目B-1（午後I）",
        durationMin: 90,
        questionCount: 2,
        scoredCount: 2,
        maxScore: 1000,
        passScore: 600,
        format: "essay",
        selectable: { total: 3, pick: 2 },
      },
      {
        key: "b2",
        label: "科目B-2（午後II）",
        durationMin: 120,
        questionCount: 1,
        scoredCount: 1,
        maxScore: 1000,
        passScore: 600,
        format: "essay",
        selectable: { total: 2, pick: 1 },
      },
    ],
  },
};

export const EXAM_ORDER: ExamKind[] = ["ip", "fe", "ap", "db"];

export function getExam(kind: string): ExamDef | undefined {
  if (kind === "ip" || kind === "fe" || kind === "ap" || kind === "db") {
    return EXAMS[kind];
  }
  return undefined;
}

export function getSession(kind: ExamKind, sessionKey: string) {
  return EXAMS[kind].sessions.find((s) => s.key === sessionKey);
}

export function phaseIndex(kind: ExamKind, phaseKey: string): number {
  return EXAMS[kind].phases.findIndex((p) => p.key === phaseKey);
}

export function nextPhase(kind: ExamKind, phaseKey: string) {
  const i = phaseIndex(kind, phaseKey);
  return EXAMS[kind].phases[i + 1] ?? null;
}
