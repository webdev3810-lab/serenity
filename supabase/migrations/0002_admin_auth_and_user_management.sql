-- Admin authentication, role management, and first-account bootstrap.

alter table public.admin_users drop constraint if exists admin_users_role_check;
alter table public.admin_users
  add constraint admin_users_role_check check (role in ('admin', 'editor', 'super_admin'));

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid() and active = true and role = 'super_admin'
  );
$$;

-- This function is callable only by the server-side service role. The advisory
-- lock makes the no-admin check safe if two first-account requests arrive at once.
create or replace function public.claim_first_admin(p_user_id uuid, p_email text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtext('serenity:first-admin'));

  if exists (select 1 from public.admin_users) then
    return false;
  end if;

  insert into public.admin_users (user_id, email, role, active)
  values (p_user_id, lower(trim(p_email)), 'super_admin', true);

  return true;
end;
$$;

revoke all on function public.claim_first_admin(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_first_admin(uuid, text) to service_role;

drop policy if exists "Admins manage admin rows" on public.admin_users;
create policy "Super admins manage admin rows" on public.admin_users
  for all using (public.is_super_admin()) with check (public.is_super_admin());
