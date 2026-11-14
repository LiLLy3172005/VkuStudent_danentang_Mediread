-- =====================================================================
-- Migration 001: Initial Supabase PostgreSQL Schema with UNKNOWN Flag Support
-- MediRead AI Production Database
-- =====================================================================

-- 0. Extensions
create extension if not exists vector;
create extension if not exists "uuid-ossp";

-- 1. Enum Types
do $$ begin
  create type public.user_role as enum ('patient', 'caregiver');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.doc_type as enum ('prescription', 'lab_report');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.doc_status as enum ('uploaded', 'processing', 'needs_review', 'confirmed', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.dose_status as enum ('pending', 'taken', 'skipped', 'missed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.link_status as enum ('pending', 'accepted', 'revoked');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.lab_flag as enum ('H', 'L', 'N', 'UNKNOWN');
exception when duplicate_object then null; end $$;

-- 2. Trigger function for updating timestamp
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- 3. Profiles Table
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  sex         text check (sex in ('nam', 'nu', 'other')),
  birth_year  int check (birth_year between 1900 and 2100),
  role        public.user_role not null default 'patient',
  timezone    text not null default 'Asia/Ho_Chi_Minh',
  preferences jsonb not null default '{"font_scale": 1.2, "tts_rate": 0.8, "tts_enabled": true}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto create profile on auth signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', 'Người dùng mới'))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. Care Links Table
create table if not exists public.care_links (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references public.profiles(id) on delete cascade,
  caregiver_id  uuid not null references public.profiles(id) on delete cascade,
  status        public.link_status not null default 'pending',
  created_at    timestamptz not null default now(),
  unique (patient_id, caregiver_id),
  check (patient_id <> caregiver_id)
);
create index if not exists idx_care_links_caregiver on public.care_links (caregiver_id) where status = 'accepted';
create index if not exists idx_care_links_patient on public.care_links (patient_id);

-- 5. Documents Table
create table if not exists public.documents (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  doc_type        public.doc_type not null,
  status          public.doc_status not null default 'uploaded',
  storage_path    text not null,
  is_pii_masked   boolean not null default true,
  facility_name   text,
  issued_date     date,
  ocr_engine      text default 'paddleocr_local',
  ocr_text        text,
  ocr_confidence  numeric(4,3) check (ocr_confidence between 0 and 1),
  quality_flags   jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_documents_user_created on public.documents (user_id, created_at desc);

drop trigger if exists trg_documents_updated on public.documents;
create trigger trg_documents_updated before update on public.documents
  for each row execute function public.set_updated_at();

-- 6. Extractions Table
create table if not exists public.extractions (
  id               uuid primary key default gen_random_uuid(),
  document_id      uuid not null references public.documents(id) on delete cascade,
  user_id          uuid not null references public.profiles(id) on delete cascade,
  version          int not null default 1,
  schema_version   text not null default '1.0',
  model            text default 'qwen2.5:7b',
  raw_json         jsonb not null,
  confirmed_json   jsonb,
  field_confidence jsonb not null default '{}'::jsonb,
  is_confirmed     boolean not null default false,
  confirmed_at     timestamptz,
  created_at       timestamptz not null default now(),
  unique (document_id, version)
);
create index if not exists idx_extractions_document on public.extractions (document_id);

-- 7. Medications Table
create table if not exists public.medications (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  document_id      uuid references public.documents(id) on delete set null,
  extraction_id    uuid references public.extractions(id) on delete set null,
  name             text not null,
  normalized_name  text,
  kb_chunk_id      uuid,
  strength         text,
  dosage_form      text,
  dose_amount      numeric,
  dose_unit        text,
  times_per_day    int check (times_per_day between 1 and 12),
  instructions     text,
  duration_days    int check (duration_days > 0),
  start_date       date,
  end_date         date,
  notes            text,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_medications_user_active on public.medications (user_id, active);

drop trigger if exists trg_medications_updated on public.medications;
create trigger trg_medications_updated before update on public.medications
  for each row execute function public.set_updated_at();

-- 8. Schedules Table
create table if not exists public.schedules (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  medication_id    uuid not null references public.medications(id) on delete cascade,
  time_of_day      time not null,
  days_of_week     smallint[] not null default '{1,2,3,4,5,6,7}',
  start_date       date not null default current_date,
  end_date         date,
  enabled          boolean not null default true,
  local_notif_ids  text[] not null default '{}',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);
create index if not exists idx_schedules_user on public.schedules (user_id, enabled);
create index if not exists idx_schedules_med on public.schedules (medication_id);

drop trigger if exists trg_schedules_updated on public.schedules;
create trigger trg_schedules_updated before update on public.schedules
  for each row execute function public.set_updated_at();

-- 9. Dose Logs Table
create table if not exists public.dose_logs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  schedule_id    uuid not null references public.schedules(id) on delete cascade,
  medication_id  uuid not null references public.medications(id) on delete cascade,
  scheduled_at   timestamptz not null,
  status         public.dose_status not null default 'pending',
  taken_at       timestamptz,
  note           text,
  created_at     timestamptz not null default now(),
  unique (schedule_id, scheduled_at)
);
create index if not exists idx_dose_logs_user_scheduled on public.dose_logs (user_id, scheduled_at desc);

-- 10. Lab Results Table
create table if not exists public.lab_results (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  document_id     uuid references public.documents(id) on delete cascade,
  extraction_id   uuid references public.extractions(id) on delete set null,
  name            text not null,
  normalized_code text,
  value_num       numeric,
  value_text      text,
  unit            text,
  ref_low         numeric,
  ref_high        numeric,
  ref_text        text,
  flag            public.lab_flag not null default 'UNKNOWN',
  flag_note       text,
  measured_at     date,
  created_at      timestamptz not null default now()
);
create index if not exists idx_lab_results_user_code on public.lab_results (user_id, normalized_code, measured_at desc);
create index if not exists idx_lab_results_doc on public.lab_results (document_id);

-- 11. Knowledge Base Chunks (pgvector 768 dimensions)
create table if not exists public.kb_chunks (
  id           uuid primary key default gen_random_uuid(),
  source_type  text not null check (source_type in ('drug', 'lab_indicator', 'general')),
  title        text not null,
  content      text not null,
  source_name  text,
  source_url   text,
  reviewed_by  text,
  reviewed_at  date,
  embedding    vector(768),
  created_at   timestamptz not null default now()
);
create index if not exists idx_kb_chunks_source_title on public.kb_chunks (source_type, title);

-- 12. Explanations Table
create table if not exists public.explanations (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  document_id     uuid references public.documents(id) on delete cascade,
  medication_id   uuid references public.medications(id) on delete cascade,
  lab_result_id   uuid references public.lab_results(id) on delete cascade,
  content         text,
  citations       jsonb not null default '[]'::jsonb,
  refused         boolean not null default false,
  refusal_reason  text check (refusal_reason in
                    ('low_ocr_confidence', 'low_evidence', 'diagnostic_request', 'service_unavailable', 'other')),
  model           text default 'qwen2.5:7b',
  created_at      timestamptz not null default now(),
  check (refused or content is not null)
);
create index if not exists idx_explanations_user on public.explanations (user_id, created_at desc);
