-- Billing columns on profiles can only be changed by the server.
-- People may update their own profile (name, branding, theme…) straight from
-- the browser, and the update rule for that is row-based, so without this a
-- signed-in user could set their own plan to 'agency', or point
-- stripe_customer_id at someone else's Stripe customer. This holds whatever
-- the row-level rules say: requests made as a signed-in or anonymous user
-- can't change these columns. The server's service key (Stripe webhook and
-- API routes), the signup trigger and security-definer functions run as
-- other roles and are unaffected.

create or replace function public.profiles_protect_billing()
returns trigger language plpgsql as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if coalesce(new.plan, 'free') <> 'free'
      or new.subscription_id is not null
      or new.subscription_period_end is not null
      or new.stripe_customer_id is not null
      or new.stripe_account_id is not null
      or coalesce(new.stripe_onboarding_complete, false) then
      raise exception 'Billing details can only be set by Voxabase.' using errcode = '42501';
    end if;
  elsif new.plan is distinct from old.plan
    or new.subscription_id is distinct from old.subscription_id
    or new.subscription_period_end is distinct from old.subscription_period_end
    or new.stripe_customer_id is distinct from old.stripe_customer_id
    or new.stripe_account_id is distinct from old.stripe_account_id
    or new.stripe_onboarding_complete is distinct from old.stripe_onboarding_complete then
    raise exception 'Billing details can only be changed by Voxabase.' using errcode = '42501';
  end if;
  return new;
end
$$;

drop trigger if exists profiles_protect_billing on public.profiles;
create trigger profiles_protect_billing before insert or update on public.profiles
  for each row execute function public.profiles_protect_billing();
