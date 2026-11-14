-- =====================================================================
-- Migration 002: Hardened Care Links RPCs and Comprehensive Row Level Security (RLS)
-- MediRead AI Production Authorization
-- =====================================================================

-- 1. Security Definer Helper: has_access
create or replace function public.has_access(owner uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select owner = (select auth.uid())
      or exists (
        select 1 from public.care_links cl
        where cl.patient_id = owner
          and cl.caregiver_id = (select auth.uid())
          and cl.status = 'accepted'
      );
$$;

revoke all on function public.has_access(uuid) from public;
grant execute on function public.has_access(uuid) to authenticated;

-- 2. Care Links Secure RPCs

-- Caregiver requests connection to Patient (Starts strictly in 'pending' state)
create or replace function public.request_care_link(p_patient_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_link_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'unauthenticated';
  end if;

  if p_patient_id = (select auth.uid()) then
    raise exception 'cannot_link_self';
  end if;

  if not exists (select 1 from public.profiles where id = p_patient_id) then
    raise exception 'patient_not_found';
  end if;

  insert into public.care_links (patient_id, caregiver_id, status)
  values (p_patient_id, (select auth.uid()), 'pending')
  on conflict (patient_id, caregiver_id)
  do update set status = 'pending', created_at = now()
  returning id into v_link_id;

  return jsonb_build_object('success', true, 'link_id', v_link_id, 'status', 'pending');
end;
$$;

-- ONLY Patient can accept connection (Caregiver CANNOT accept their own request)
create or replace function public.accept_care_link(p_link_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_count int;
begin
  if (select auth.uid()) is null then
    raise exception 'unauthenticated';
  end if;

  update public.care_links
  set status = 'accepted'
  where id = p_link_id
    and patient_id = (select auth.uid())
    and status = 'pending';

  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'unauthorized_or_not_pending';
  end if;

  return jsonb_build_object('success', true, 'status', 'accepted');
end;
$$;

-- Either Patient or Caregiver can revoke connection
create or replace function public.revoke_care_link(p_link_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_count int;
begin
  if (select auth.uid()) is null then
    raise exception 'unauthenticated';
  end if;

  update public.care_links
  set status = 'revoked'
  where id = p_link_id
    and (patient_id = (select auth.uid()) or caregiver_id = (select auth.uid()));

  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'link_not_found_or_unauthorized';
  end if;

  return jsonb_build_object('success', true, 'status', 'revoked');
end;
$$;

revoke all on function public.request_care_link(uuid) from public;
grant execute on function public.request_care_link(uuid) to authenticated;

revoke all on function public.accept_care_link(uuid) from public;
grant execute on function public.accept_care_link(uuid) to authenticated;

revoke all on function public.revoke_care_link(uuid) from public;
grant execute on function public.revoke_care_link(uuid) to authenticated;


-- 3. Enable RLS on All Tables
alter table public.profiles      enable row level security;
alter table public.care_links    enable row level security;
alter table public.documents     enable row level security;
alter table public.extractions   enable row level security;
alter table public.medications   enable row level security;
alter table public.schedules     enable row level security;
alter table public.dose_logs     enable row level security;
alter table public.lab_results   enable row level security;
alter table public.explanations  enable row level security;
alter table public.kb_chunks     enable row level security;


-- 4. Policies for profiles
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select to authenticated
  using (public.has_access(id));

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));


-- 5. Policies for care_links
drop policy if exists "care_links_select" on public.care_links;
create policy "care_links_select" on public.care_links for select to authenticated
  using (patient_id = (select auth.uid()) or caregiver_id = (select auth.uid()));

drop policy if exists "care_links_insert" on public.care_links;
create policy "care_links_insert" on public.care_links for insert to authenticated
  with check ((patient_id = (select auth.uid()) or caregiver_id = (select auth.uid()))
              and status = 'pending');

drop policy if exists "care_links_update_patient" on public.care_links;
create policy "care_links_update_patient" on public.care_links for update to authenticated
  using (patient_id = (select auth.uid())) with check (patient_id = (select auth.uid()));

drop policy if exists "care_links_delete" on public.care_links;
create policy "care_links_delete" on public.care_links for delete to authenticated
  using (patient_id = (select auth.uid()) or caregiver_id = (select auth.uid()));


-- 6. Policies for Medical Records (Ownership & Caregiver Access)
-- documents
drop policy if exists "documents_select" on public.documents;
create policy "documents_select" on public.documents for select to authenticated
  using (public.has_access(user_id));

drop policy if exists "documents_insert" on public.documents;
create policy "documents_insert" on public.documents for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "documents_update" on public.documents;
create policy "documents_update" on public.documents for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "documents_delete" on public.documents;
create policy "documents_delete" on public.documents for delete to authenticated
  using (user_id = (select auth.uid()));


-- extractions (Cross-Ownership Check)
drop policy if exists "extractions_select" on public.extractions;
create policy "extractions_select" on public.extractions for select to authenticated
  using (public.has_access(user_id));

drop policy if exists "extractions_insert" on public.extractions;
create policy "extractions_insert" on public.extractions for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.documents d
      where d.id = extractions.document_id
        and d.user_id = (select auth.uid())
    )
  );

drop policy if exists "extractions_update" on public.extractions;
create policy "extractions_update" on public.extractions for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "extractions_delete" on public.extractions;
create policy "extractions_delete" on public.extractions for delete to authenticated
  using (user_id = (select auth.uid()));


-- lab_results (Cross-Ownership Check)
drop policy if exists "lab_results_select" on public.lab_results;
create policy "lab_results_select" on public.lab_results for select to authenticated
  using (public.has_access(user_id));

drop policy if exists "lab_results_insert" on public.lab_results;
create policy "lab_results_insert" on public.lab_results for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      document_id is null
      or exists (
        select 1 from public.documents d
        where d.id = lab_results.document_id
          and d.user_id = (select auth.uid())
      )
    )
  );

drop policy if exists "lab_results_update" on public.lab_results;
create policy "lab_results_update" on public.lab_results for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "lab_results_delete" on public.lab_results;
create policy "lab_results_delete" on public.lab_results for delete to authenticated
  using (user_id = (select auth.uid()));


-- medications
drop policy if exists "medications_select" on public.medications;
create policy "medications_select" on public.medications for select to authenticated
  using (public.has_access(user_id));

drop policy if exists "medications_insert" on public.medications;
create policy "medications_insert" on public.medications for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "medications_update" on public.medications;
create policy "medications_update" on public.medications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "medications_delete" on public.medications;
create policy "medications_delete" on public.medications for delete to authenticated
  using (user_id = (select auth.uid()));


-- schedules
drop policy if exists "schedules_select" on public.schedules;
create policy "schedules_select" on public.schedules for select to authenticated
  using (public.has_access(user_id));

drop policy if exists "schedules_insert" on public.schedules;
create policy "schedules_insert" on public.schedules for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.medications m
      where m.id = schedules.medication_id
        and m.user_id = (select auth.uid())
    )
  );

drop policy if exists "schedules_update" on public.schedules;
create policy "schedules_update" on public.schedules for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "schedules_delete" on public.schedules;
create policy "schedules_delete" on public.schedules for delete to authenticated
  using (user_id = (select auth.uid()));


-- dose_logs
drop policy if exists "dose_logs_select" on public.dose_logs;
create policy "dose_logs_select" on public.dose_logs for select to authenticated
  using (public.has_access(user_id));

drop policy if exists "dose_logs_insert" on public.dose_logs;
create policy "dose_logs_insert" on public.dose_logs for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "dose_logs_update" on public.dose_logs;
create policy "dose_logs_update" on public.dose_logs for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "dose_logs_delete" on public.dose_logs;
create policy "dose_logs_delete" on public.dose_logs for delete to authenticated
  using (user_id = (select auth.uid()));


-- explanations
drop policy if exists "explanations_select" on public.explanations;
create policy "explanations_select" on public.explanations for select to authenticated
  using (public.has_access(user_id));

drop policy if exists "explanations_insert" on public.explanations;
create policy "explanations_insert" on public.explanations for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "explanations_delete" on public.explanations;
create policy "explanations_delete" on public.explanations for delete to authenticated
  using (user_id = (select auth.uid()));


-- kb_chunks
drop policy if exists "kb_chunks_read" on public.kb_chunks;
create policy "kb_chunks_read" on public.kb_chunks for select to authenticated using (true);
