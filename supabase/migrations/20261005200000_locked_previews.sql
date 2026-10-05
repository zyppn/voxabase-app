-- Locked previews: before a client pays, they can see a small, watermarked
-- preview of each photo, video (one frame) and PDF (first page), made in the
-- owner's browser at upload. The real file stays locked.

-- Per portal: show previews while locked (on unless the owner turns it off)
alter table public.portals add column if not exists locked_previews boolean not null default true;

-- The watermarked previews. Read only by the server, after the portal's
-- password check; never the original file.
do $$ begin
  execute format(
    'create table if not exists public.file_previews (file_id %s primary key references public.files(id) on delete cascade, data text not null)',
    (select format_type(atttypid, atttypmod) from pg_attribute where attrelid = 'public.files'::regclass and attname = 'id')
  );
end $$;
alter table public.file_previews enable row level security;
revoke all on public.file_previews from anon, authenticated;
