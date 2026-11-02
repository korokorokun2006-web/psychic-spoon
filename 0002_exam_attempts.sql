-- Per-user mock exam attempts and answers
create table if not exists exam_attempts (
  id              text primary key,
  user_id         text not null,
  exam_kind       text not null,
  session_key     text not null,
  status          text not null default 'in_progress',
  current_phase   text not null,
  started_at      timestamptz not null default now(),
  finished_at     timestamptz,
  phase_started_at timestamptz not null default now(),
  question_ids    jsonb not null default '[]'::jsonb,
  scored_ids      jsonb not null default '[]'::jsonb,
  selected_ids    jsonb not null default '[]'::jsonb,
  scores          jsonb not null default '{}'::jsonb,
  passed          boolean,
  created_at      timestamptz not null default now()
);
create index if not exists exam_attempts_user_id_idx on exam_attempts (user_id);
create index if not exists exam_attempts_user_created_idx on exam_attempts (user_id, created_at desc);

create table if not exists exam_answers (
  id           serial primary key,
  attempt_id   text not null references exam_attempts(id) on delete cascade,
  user_id      text not null,
  question_id  text not null,
  phase        text not null,
  answer       jsonb not null default 'null'::jsonb,
  flagged      boolean not null default false,
  is_correct   boolean,
  earned       integer,
  max_points   integer,
  ai_feedback  text,
  updated_at   timestamptz not null default now(),
  unique (attempt_id, question_id)
);
create index if not exists exam_answers_attempt_idx on exam_answers (attempt_id);
create index if not exists exam_answers_user_idx on exam_answers (user_id);
