-- Files unlock after payment.
-- portals.lock_until_paid: when on and the portal has an unpaid invoice, the
-- client sees the file list but can't view or download any file until the
-- invoice is paid (the Stripe webhook sets invoice_paid, which unlocks them).
-- Enforced in the file and download-all routes; the owner and team always
-- have access. Off for every existing portal.

alter table public.portals add column if not exists lock_until_paid boolean not null default false;
