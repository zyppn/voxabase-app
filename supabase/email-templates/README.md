# Supabase auth emails

Paste each file into Supabase → Authentication → Emails (Body → Source), with this subject:

| Supabase template    | File                | Subject                         |
|----------------------|---------------------|---------------------------------|
| Confirm signup       | confirm-signup.html | Confirm your Voxabase account   |
| Reset password       | reset-password.html | Reset your Voxabase password    |
| Change email address | change-email.html   | Confirm your new Voxabase email |

Copy one to the clipboard from the app folder:

    pbcopy < supabase/email-templates/reset-password.html

The logo in the header loads from https://voxabase.com/email/voxabase-logo.png
(email/voxabase-logo.png in the voxabase-site repo).
