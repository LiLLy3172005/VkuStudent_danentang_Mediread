-- =====================================================================
-- Migration 003: Supabase Storage Configuration and Object-Level Access Control
-- MediRead AI Production Private Object Storage
-- =====================================================================

-- 1. Create Private Bucket 'documents' (10MB limit, strictly private)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  10485760,  -- 10 MB in bytes
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

-- 2. Storage Policies with Folder-based Multi-tenant Isolation
-- Path format: {user_id}/{document_id}/{filename}

drop policy if exists "documents_obj_select" on storage.objects;
create policy "documents_obj_select" on storage.objects for select to authenticated
  using (
    bucket_id = 'documents'
    and public.has_access(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "documents_obj_insert" on storage.objects;
create policy "documents_obj_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "documents_obj_update" on storage.objects;
create policy "documents_obj_update" on storage.objects for update to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "documents_obj_delete" on storage.objects;
create policy "documents_obj_delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
