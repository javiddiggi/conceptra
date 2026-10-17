-- Apply only after backing up and verifying existing chapter/question data.
alter table public.biology_chapters
  drop constraint if exists biology_chapters_subject_check;

alter table public.biology_chapters
  add constraint biology_chapters_subject_check
  check (subject in ('Biology', 'Physics', 'Chemistry'));

create or replace function public.append_chapter_questions(
  target_chapter_id text,
  new_questions jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  updated_questions jsonb;
begin
  if not public.is_conceptra_admin() then
    raise exception 'Administrator access required';
  end if;
  if jsonb_typeof(new_questions) <> 'array' or jsonb_array_length(new_questions) = 0 then
    raise exception 'At least one question is required';
  end if;

  update public.biology_chapters
  set questions = questions || new_questions,
      updated_at = now()
  where id = target_chapter_id
  returning questions into updated_questions;

  if updated_questions is null then
    raise exception 'Chapter not found';
  end if;
  return updated_questions;
end;
$$;

revoke all on function public.append_chapter_questions(text, jsonb) from public, anon;
grant execute on function public.append_chapter_questions(text, jsonb) to authenticated;
