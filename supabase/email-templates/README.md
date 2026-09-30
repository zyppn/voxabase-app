# Supabase auth emails

Paste each file into Supabase → Authentication → Emails (Body → Source), with this subject:

| Supabase template    | File                | Subject                         |
|----------------------|---------------------|---------------------------------|
| Confirm signup       | confirm-signup.html | Confirm your Voxabase account   |
| Reset password       | reset-password.html | Reset your Voxabase password    |
| Change email address | change-email.html   | Confirm your new Voxabase email |
| Password changed     | password-changed.html | Your Voxabase password was changed |
| Email address changed | email-changed.html | Your Voxabase email was changed |
| MFA method added     | mfa-added.html      | Two-step verification added to your Voxabase account |
| MFA method removed   | mfa-removed.html    | Two-step verification removed from your Voxabase account |

Copy one to the clipboard from the app folder:

    pbcopy < supabase/email-templates/reset-password.html

The logo in the header loads from https://voxabase.com/email/voxabase-logo.png
(email/voxabase-logo.png in the voxabase-site repo).
