import type { PublicQuestion } from "@/lib/exams/public";
import type { AnswerValue, ChoiceKey } from "@/lib/exams/types";
import { CHOICE_KEYS } from "@/lib/exams/types";
import { FIELD_LABEL } from "@/lib/exams/labels";

export function QuestionView({
  question,
  index,
  total,
  value,
  onChange,
}: {
  question: PublicQuestion;
  index: number;
  total: number;
  value: AnswerValue;
  onChange: (v: AnswerValue) => void;
}) {
  return (
    <article className="rounded-xl border border-line bg-card p-5 shadow-card sm:p-7">
      <p className="text-xs font-medium tracking-wide text-muted">
        問{index + 1} / {total}
        <span className="mx-2 text-line-strong">/</span>
        {FIELD_LABEL[question.field]}
        <span className="mx-2 text-line-strong">/</span>
        {question.category}
      </p>
      {question.kind === "mcq" ? (
        <McqView q={question} value={typeof value === "number" ? value : null} onChange={onChange} />
      ) : question.kind === "multi" ? (
        <MultiView
          q={question}
          value={isRecord(value) ? value : {}}
          onChange={onChange}
        />
      ) : (
        <EssayView
          q={question}
          value={isRecord(value) ? value : {}}
          onChange={onChange}
        />
      )}
    </article>
  );
}

function McqView({
  q,
  value,
  onChange,
}: {
  q: Extract<PublicQuestion, { kind: "mcq" }>;
  value: number | null;
  onChange: (v: AnswerValue) => void;
}) {
  return (
    <div>
      <h2 className="mt-3 text-base font-medium leading-relaxed sm:text-[17px]">{q.stem}</h2>
      <ul className="mt-5 grid gap-2">
        {q.choices.map((c, i) => (
          <ChoiceRow
            key={i}
            label={CHOICE_KEYS[i] as ChoiceKey}
            text={c}
            selected={value === i}
            onSelect={() => onChange(i)}
          />
        ))}
      </ul>
    </div>
  );
}

function MultiView({
  q,
  value,
  onChange,
}: {
  q: Extract<PublicQuestion, { kind: "multi" }>;
  value: Record<string, unknown>;
  onChange: (v: AnswerValue) => void;
}) {
  return (
    <div>
      <h2 className="font-display mt-2 text-lg font-semibold">{q.title}</h2>
      {q.passage ? (
        <pre className="mt-4 max-h-[50vh] overflow-auto whitespace-pre-wrap rounded-lg bg-paper-2 p-4 text-sm leading-relaxed text-ink-soft">
          {q.passage}
        </pre>
      ) : null}
      {q.code ? (
        <pre className="mt-3 overflow-auto rounded-lg bg-navy px-4 py-3 font-mono text-[13px] leading-relaxed text-navy-fg">
          {q.code}
        </pre>
      ) : null}
      <p className="mt-4 text-sm leading-relaxed">{q.stem}</p>
      <div className="mt-4 grid gap-6">
        {q.blanks.map((b) => (
          <div key={b.id}>
            <p className="text-sm font-medium text-navy">
              {b.label}
              {b.prompt ? `　${b.prompt}` : ""}
            </p>
            <ul className="mt-2 grid gap-2">
              {b.choices.map((c, i) => (
                <ChoiceRow
                  key={i}
                  label={CHOICE_KEYS[i] ?? `${i + 1}`}
                  text={c}
                  selected={value[b.id] === i}
                  onSelect={() => onChange({ ...asMap(value), [b.id]: i })}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function EssayView({
  q,
  value,
  onChange,
}: {
  q: Extract<PublicQuestion, { kind: "essay" }>;
  value: Record<string, unknown>;
  onChange: (v: AnswerValue) => void;
}) {
  return (
    <div>
      <h2 className="font-display mt-2 text-lg font-semibold">{q.title}</h2>
      {q.required ? (
        <p className="mt-2 inline-block rounded-full bg-navy px-2.5 py-0.5 text-xs text-navy-fg">必須</p>
      ) : null}
      <pre className="mt-4 max-h-[45vh] overflow-auto whitespace-pre-wrap rounded-lg bg-paper-2 p-4 text-sm leading-relaxed text-ink-soft">
        {q.passage}
      </pre>
      <div className="mt-6 grid gap-6">
        {q.parts.map((p) => (
          <section key={p.id} className="border-t border-line pt-4">
            <p className="text-sm font-semibold text-navy">
              {p.label}
              <span className="ml-2 font-normal text-muted">配点 {p.maxPoints}</span>
            </p>
            <p className="mt-1 text-sm leading-relaxed">{p.prompt}</p>
            {p.type === "choice" && p.choices ? (
              <ul className="mt-3 grid gap-2">
                {p.choices.map((c, i) => {
                  const key = CHOICE_KEYS[i] ?? String(i);
                  const selected = value[p.id] === key || value[p.id] === c;
                  return (
                    <ChoiceRow
                      key={i}
                      label={key}
                      text={c}
                      selected={Boolean(selected)}
                      onSelect={() => onChange({ ...asMap(value), [p.id]: key })}
                    />
                  );
                })}
              </ul>
            ) : (
              <textarea
                className="mt-3 min-h-28 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm"
                placeholder={p.type === "calc" ? "計算過程と答え" : "解答を入力"}
                value={String(value[p.id] ?? "")}
                onChange={(e) => onChange({ ...asMap(value), [p.id]: e.target.value })}
              />
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

function ChoiceRow({
  label,
  text,
  selected,
  onSelect,
}: {
  label: string;
  text: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={
          "flex min-h-11 w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors duration-150 " +
          (selected
            ? "border-navy bg-paper-2 text-ink"
            : "border-line bg-card hover:border-line-strong hover:bg-paper-2")
        }
      >
        <span
          className={
            "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold " +
            (selected ? "bg-navy text-navy-fg" : "bg-paper-2 text-ink-soft")
          }
        >
          {label}
        </span>
        <span className="pt-0.5 leading-relaxed">{text}</span>
      </button>
    </li>
  );
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asMap(v: Record<string, unknown>): Record<string, number | string | null> {
  const out: Record<string, number | string | null> = {};
  for (const [k, val] of Object.entries(v)) {
    if (typeof val === "number" || typeof val === "string") out[k] = val;
    else if (val == null) out[k] = null;
    else out[k] = String(val);
  }
  return out;
}

