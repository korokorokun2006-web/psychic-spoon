import type { ExamKind, FieldKind } from "./types";

export const FIELD_LABEL: Record<FieldKind, string> = {
  strategy: "ストラテジ系",
  management: "マネジメント系",
  technology: "テクノロジ系",
  advanced: "高度専門",
};

export const EXAM_PASS_LABEL: Record<ExamKind, string> = {
  ip: "ＩＴパスポート試験　合格",
  fe: "基本情報技術者試験　合格",
  ap: "応用情報技術者試験　合格",
  db: "データベーススペシャリスト試験　合格",
};

export const EXAM_FAIL_LABEL: Record<ExamKind, string> = {
  ip: "ＩＴパスポート試験　不合格",
  fe: "基本情報技術者試験　不合格",
  ap: "応用情報技術者試験　不合格",
  db: "データベーススペシャリスト試験　不合格",
};
