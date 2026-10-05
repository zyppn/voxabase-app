-- Logo and graphic previews are now blurred as well as watermarked. Clear the
-- image previews made before that; the owner's browser makes new ones the
-- next time the portal is opened.
delete from public.file_previews fp
using public.files f
where f.id = fp.file_id and f.file_type like 'image/%';
