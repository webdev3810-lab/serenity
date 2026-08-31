create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  reference text not null default ('MSG-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  first_name text not null check (char_length(first_name) between 1 and 80),
  last_name text not null check (char_length(last_name) between 1 and 80),
  email text not null check (char_length(email) between 3 and 150),
  phone text not null default '' check (char_length(phone) <= 30),
  project_type text not null default '' check (char_length(project_type) <= 80),
  preferred_house text not null default '' check (char_length(preferred_house) <= 80),
  message text not null check (char_length(message) between 1 and 2000),
  status text not null default 'new' check (status in ('new', 'contacted', 'closed', 'spam')),
  internal_notes text not null default '' check (char_length(internal_notes) <= 4000),
  idempotency_key text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists contact_messages_reference_uidx on public.contact_messages(reference);
create unique index if not exists contact_messages_idempotency_uidx on public.contact_messages(idempotency_key) where idempotency_key is not null;

drop trigger if exists contact_messages_updated_at on public.contact_messages;
create trigger contact_messages_updated_at before update on public.contact_messages for each row execute function public.set_updated_at();

alter table public.contact_messages enable row level security;
drop policy if exists "Admins manage contact messages" on public.contact_messages;
create policy "Admins manage contact messages" on public.contact_messages for all using (public.is_admin()) with check (public.is_admin());
