-- Run only in the Supabase SQL editor with an administrative database role.
-- Replace the email below before executing.

begin;

do $$
declare
  master_email constant text := 'SUBSTITUA_PELO_EMAIL_DO_MASTER';
  master_user_id uuid;
begin
  if master_email = 'SUBSTITUA_PELO_EMAIL_DO_MASTER' then
    raise exception 'Replace master_email before running this script';
  end if;

  select users.id
  into master_user_id
  from auth.users as users
  where lower(users.email) = lower(master_email);

  if master_user_id is null then
    raise exception
      'The Google account % must sign in once before becoming Master',
      master_email;
  end if;

  insert into public.system_admins (user_id)
  values (master_user_id)
  on conflict (user_id) do nothing;

  update public.app_users
  set
    access_status = 'approved',
    reviewed_at = now(),
    decision_reason = null,
    updated_at = now()
  where user_id = master_user_id;

  insert into public.authorized_users (email)
  values (master_email)
  on conflict (email) do nothing;
end
$$;

commit;

-- To remove a Master, run the statement below separately after ensuring that
-- another Master exists:
-- delete from public.system_admins
-- where user_id = (
--   select id from auth.users where lower(email) = lower('email@exemplo.com')
-- );
