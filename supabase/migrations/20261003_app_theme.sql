-- Appearance (System / Light / Dark) saved on the account, so it follows you
-- across devices. The browser also keeps the last one used for the sign-in
-- screen. Null means never chosen: the app then saves the browser's current one.
alter table public.profiles
  add column if not exists app_theme text
  check (app_theme in ('system', 'light', 'dark'));
