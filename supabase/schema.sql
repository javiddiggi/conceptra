create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.biology_chapters (
  id text primary key,
  class_number smallint not null check (class_number in (11, 12)),
  subject text not null default 'Biology' check (subject = 'Biology'),
  chapter_number integer not null check (chapter_number > 0),
  title text not null check (length(trim(title)) > 0),
  description text not null default '',
  youtube_url text not null default '',
  notes_pdf text,
  questions jsonb not null default '[]'::jsonb check (jsonb_typeof(questions) = 'array'),
  is_published boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.hidden_biology_chapters (
  id text primary key,
  hidden_at timestamptz not null default now()
);

create or replace function public.is_conceptra_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users as admins
    where admins.user_id = (select auth.uid())
  );
$$;

alter table public.admin_users enable row level security;
alter table public.biology_chapters enable row level security;
alter table public.hidden_biology_chapters enable row level security;

drop policy if exists "Admins can read their own admin record" on public.admin_users;
create policy "Admins can read their own admin record"
  on public.admin_users for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Published Biology chapters are public" on public.biology_chapters;
create policy "Published Biology chapters are public"
  on public.biology_chapters for select to anon, authenticated
  using (is_published);

drop policy if exists "Admins can manage Biology chapters" on public.biology_chapters;
drop policy if exists "Admins can read all Biology chapters" on public.biology_chapters;
create policy "Admins can read all Biology chapters"
  on public.biology_chapters for select to authenticated
  using ((select public.is_conceptra_admin()));

drop policy if exists "Conceptra admins can insert Biology chapters" on public.biology_chapters;
create policy "Conceptra admins can insert Biology chapters"
  on public.biology_chapters for insert to authenticated
  with check ((select public.is_conceptra_admin()));

drop policy if exists "Conceptra admins can update Biology chapters" on public.biology_chapters;
create policy "Conceptra admins can update Biology chapters"
  on public.biology_chapters for update to authenticated
  using ((select public.is_conceptra_admin()))
  with check ((select public.is_conceptra_admin()));

drop policy if exists "Conceptra admins can delete Biology chapters" on public.biology_chapters;
create policy "Conceptra admins can delete Biology chapters"
  on public.biology_chapters for delete to authenticated
  using ((select public.is_conceptra_admin()));

drop policy if exists "Hidden chapter IDs are public" on public.hidden_biology_chapters;
create policy "Hidden chapter IDs are public"
  on public.hidden_biology_chapters for select to anon, authenticated
  using (true);

drop policy if exists "Admins can manage hidden chapters" on public.hidden_biology_chapters;
drop policy if exists "Conceptra admins can insert hidden chapter IDs" on public.hidden_biology_chapters;
create policy "Conceptra admins can insert hidden chapter IDs"
  on public.hidden_biology_chapters for insert to authenticated
  with check ((select public.is_conceptra_admin()));

drop policy if exists "Conceptra admins can update hidden chapter IDs" on public.hidden_biology_chapters;
create policy "Conceptra admins can update hidden chapter IDs"
  on public.hidden_biology_chapters for update to authenticated
  using ((select public.is_conceptra_admin()))
  with check ((select public.is_conceptra_admin()));

drop policy if exists "Conceptra admins can delete hidden chapter IDs" on public.hidden_biology_chapters;
create policy "Conceptra admins can delete hidden chapter IDs"
  on public.hidden_biology_chapters for delete to authenticated
  using ((select public.is_conceptra_admin()));

grant select on public.biology_chapters to anon, authenticated;
grant select, insert, update, delete on public.biology_chapters to authenticated;
grant select on public.hidden_biology_chapters to anon, authenticated;
grant select on public.admin_users to authenticated;
revoke all on function public.is_conceptra_admin() from public, anon;
grant execute on function public.is_conceptra_admin() to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chapter-notes', 'chapter-notes', true, 52428800, array['application/pdf'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins can upload chapter PDFs" on storage.objects;
create policy "Admins can upload chapter PDFs"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'chapter-notes' and public.is_conceptra_admin());

drop policy if exists "Admins can update chapter PDFs" on storage.objects;
create policy "Admins can update chapter PDFs"
  on storage.objects for update to authenticated
  using (bucket_id = 'chapter-notes' and public.is_conceptra_admin())
  with check (bucket_id = 'chapter-notes' and public.is_conceptra_admin());

drop policy if exists "Admins can delete chapter PDFs" on storage.objects;
create policy "Admins can delete chapter PDFs"
  on storage.objects for delete to authenticated
  using (bucket_id = 'chapter-notes' and public.is_conceptra_admin());

-- After creating the owner account in Supabase Auth, authorize it with:
-- insert into public.admin_users (user_id)
-- select id from auth.users where email = 'owner@example.com';
