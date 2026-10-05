-- The preview watermark has a new, lighter style. Clear previews of files the
-- owner's browser can remake (up to 50 MB); it makes new ones the next time
-- the portal is opened. Bigger files keep the preview made at upload.
delete from public.file_previews fp
using public.files f
where f.id = fp.file_id and coalesce(f.file_size, 0) <= 52428800;
