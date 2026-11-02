-- Store the full paper (all phases / candidates) on each attempt
alter table exam_attempts
  add column if not exists papers jsonb not null default '{}'::jsonb;
