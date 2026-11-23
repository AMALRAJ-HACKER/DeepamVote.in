begin;

create table public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  provider_order_id text not null unique,
  provider_payment_id text unique,
  mode text not null check (mode in ('test','live')),
  amount_paise integer not null default 1000 check (amount_paise = 1000),
  currency text not null default 'INR' check (currency = 'INR'),
  choice text not null check (choice in ('YES','NO')),
  status text not null default 'pending' check (status in ('pending','failed','confirmed')),
  terms_version text not null,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  check ((status = 'confirmed') = (confirmed_at is not null)),
  check ((status = 'confirmed') = (provider_payment_id is not null))
);
create index payment_orders_mode_confirmed on public.payment_orders(mode,confirmed_at) where status = 'confirmed';
create table public.votes (
  id uuid primary key default gen_random_uuid(),
  payment_order_id uuid not null unique references public.payment_orders(id),
  choice text not null check (choice in ('YES','NO')),
  created_at timestamptz not null default now()
);
create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider_event_id text not null unique,
  event_type text not null check (event_type in ('payment.captured','payment.failed')),
  processed_at timestamptz not null default now()
);
create table public.request_buckets (
  bucket_key text primary key,
  hits integer not null check (hits > 0),
  expires_at timestamptz not null
);
create index request_buckets_expiry on public.request_buckets(expires_at);

alter table public.payment_orders enable row level security;
alter table public.votes enable row level security;
alter table public.payment_events enable row level security;
alter table public.request_buckets enable row level security;
-- Deny by default, including for optional signed-in visitors.
revoke all on public.payment_orders, public.votes, public.payment_events, public.request_buckets from public, anon, authenticated, service_role;
grant select,insert on public.payment_orders to service_role;

create function public.take_request_slot(p_key text,p_limit integer,p_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare requests integer;
begin
  if p_limit not between 1 and 1000 or p_seconds not between 1 and 86400 then raise exception 'Invalid window'; end if;
  delete from public.request_buckets where expires_at <= now();
  insert into public.request_buckets as b(bucket_key,hits,expires_at)
  values(p_key,1,now()+make_interval(secs=>p_seconds))
  on conflict(bucket_key) do update set hits=b.hits+1
    where b.hits < p_limit
  returning hits into requests;
  return requests is not null;
end;
$$;

-- All event deduplication, order state changes and vote insertion commit together.
create function public.apply_payment_event(p_event text,p_kind text,p_order text,p_payment text,
  p_status text,p_amount integer,p_currency text,p_mode text)
returns void language plpgsql security definer set search_path = '' as $$
declare ord public.payment_orders%rowtype;
begin
  select * into ord from public.payment_orders where provider_order_id=p_order and mode=p_mode for update;
  if not found then raise exception 'Unknown order'; end if;
  if p_amount is distinct from ord.amount_paise or p_currency is distinct from ord.currency then raise exception 'Payment mismatch'; end if;
  if not ((p_kind='payment.captured' and p_status='captured') or (p_kind='payment.failed' and p_status='failed'))
     or p_kind is null or p_status is null or nullif(p_payment,'') is null then raise exception 'Invalid payment state'; end if;
  insert into public.payment_events(provider_event_id,event_type) values(p_event,p_kind)
    on conflict(provider_event_id) do nothing;
  if not found or ord.status='confirmed' then return; end if;
  if p_kind='payment.failed' then
    update public.payment_orders set status='failed' where id=ord.id;
    return;
  end if;
  update public.payment_orders set status='confirmed',provider_payment_id=p_payment,confirmed_at=now() where id=ord.id;
  insert into public.votes(payment_order_id,choice) values(ord.id,ord.choice);
end;
$$;

create function public.participation_stats(p_mode text)
returns table(yes bigint, no bigint, total bigint, gross bigint, updated timestamptz)
language sql stable security definer set search_path = '' as $$
  select count(*) filter(where v.choice='YES'), count(*) filter(where v.choice='NO'),
         count(*), count(*) * 10, max(o.confirmed_at)
  from public.votes v join public.payment_orders o on v.payment_order_id=o.id
  where o.status='confirmed' and o.mode=p_mode;
$$;

revoke all on function public.take_request_slot(text,integer,integer), public.apply_payment_event(text,text,text,text,text,integer,text,text), public.participation_stats(text) from public, anon, authenticated;
grant execute on function public.take_request_slot(text,integer,integer), public.apply_payment_event(text,text,text,text,text,integer,text,text), public.participation_stats(text) to service_role;
commit;
