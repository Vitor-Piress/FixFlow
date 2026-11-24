-- ============================================================================
-- FixFlow: Clients directory, quote payment plans, installments & cashbook sync
-- ============================================================================

-- 1. Phone normalization helper (Brazilian 10/11 digits without +55 country prefix)
create or replace function public.normalize_br_phone_digits(p_raw text)
returns text
language sql
immutable
as $$
  select case
    when p_raw is null then null
    else (
      select case
        when d = '' then null
        when length(d) in (12, 13) and left(d, 2) = '55' then substr(d, 3)
        else d
      end
      from (
        select regexp_replace(p_raw, '\D', '', 'g') as d
      ) sub
    )
  end;
$$;

-- 2. Clients table
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  phone_normalized text generated always as (public.normalize_br_phone_digits(phone)) stored,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_clients_name_lower
  on public.clients (lower(name));

create unique index if not exists uq_clients_phone_normalized
  on public.clients (phone_normalized)
  where phone_normalized is not null and length(phone_normalized) >= 10;

drop trigger if exists trg_clients_updated_at on public.clients;
create trigger trg_clients_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

alter table public.clients enable row level security;

drop policy if exists "Authenticated full access on clients" on public.clients;
create policy "Authenticated full access on clients"
  on public.clients for all to authenticated using (true) with check (true);

-- 3. Payment mode enum & new columns on quotes
do $$
begin
  if not exists (
    select 1
      from pg_type t
      join pg_namespace n on n.oid = t.typnamespace
     where n.nspname = 'public'
       and t.typname = 'payment_mode'
  ) then
    create type public.payment_mode as enum (
      'cash',
      'split',
      'installments',
      'custom'
    );
  end if;
end
$$;

alter table public.quotes
  add column if not exists client_id uuid references public.clients(id) on delete set null,
  add column if not exists payment_mode public.payment_mode not null default 'cash',
  add column if not exists payment_deposit_percent smallint not null default 50,
  add column if not exists payment_installments_count smallint not null default 1;

alter table public.quotes
  drop constraint if exists quotes_payment_deposit_percent_check,
  add constraint quotes_payment_deposit_percent_check
    check (payment_deposit_percent between 1 and 99);

alter table public.quotes
  drop constraint if exists quotes_payment_installments_count_check,
  add constraint quotes_payment_installments_count_check
    check (payment_installments_count between 1 and 24);

create index if not exists idx_quotes_client_id
  on public.quotes (client_id);

-- Backfill unique clients from existing quotes with name and valid phone
insert into public.clients (name, phone, address)
select distinct on (public.normalize_br_phone_digits(q.client_phone))
  trim(q.client_name),
  trim(q.client_phone),
  nullif(trim(coalesce(q.client_address, '')), '')
from public.quotes q
where trim(coalesce(q.client_name, '')) <> ''
  and length(coalesce(public.normalize_br_phone_digits(q.client_phone), '')) in (10, 11)
order by public.normalize_br_phone_digits(q.client_phone), q.created_at desc
on conflict (phone_normalized)
  where phone_normalized is not null and length(phone_normalized) >= 10
do nothing;

update public.quotes q
   set client_id = c.id
  from public.clients c
 where q.client_id is null
   and length(coalesce(public.normalize_br_phone_digits(q.client_phone), '')) in (10, 11)
   and c.phone_normalized = public.normalize_br_phone_digits(q.client_phone);

-- 4. Quote payments (installments / split entries)
create table if not exists public.quote_payments (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  installment_number smallint not null check (installment_number >= 1),
  label text not null,
  amount_cents integer not null check (amount_cents >= 0),
  due_date date,
  status public.transaction_status not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_quote_payments_quote_installment unique (quote_id, installment_number)
);

create index if not exists idx_quote_payments_quote_id
  on public.quote_payments (quote_id);

create index if not exists idx_quote_payments_due_date
  on public.quote_payments (due_date)
  where status = 'pending';

drop trigger if exists trg_quote_payments_updated_at on public.quote_payments;
create trigger trg_quote_payments_updated_at
  before update on public.quote_payments
  for each row execute function public.set_updated_at();

alter table public.quote_payments enable row level security;

drop policy if exists "Authenticated full access on quote_payments" on public.quote_payments;
create policy "Authenticated full access on quote_payments"
  on public.quote_payments for all to authenticated using (true) with check (true);

-- 5. Link financial_transactions per quote payment installment
alter table public.financial_transactions
  add column if not exists quote_payment_id uuid references public.quote_payments(id) on delete cascade;

drop index if exists public.uq_financial_transactions_quote_id;

create unique index if not exists uq_financial_transactions_quote_payment_id
  on public.financial_transactions (quote_payment_id)
  where quote_payment_id is not null;

create unique index if not exists uq_financial_transactions_legacy_quote_id
  on public.financial_transactions (quote_id)
  where quote_id is not null and quote_payment_id is null;

-- Backfill existing paid quotes into quote_payments and link existing cashbook entries
with inserted_legacy_payments as (
  insert into public.quote_payments (
    quote_id,
    installment_number,
    label,
    amount_cents,
    due_date,
    status,
    paid_at
  )
  select
    q.id,
    1,
    'Pagamento à vista',
    q.total_cents,
    (coalesce(q.paid_at, q.updated_at, q.created_at) at time zone 'America/Sao_Paulo')::date,
    'paid'::public.transaction_status,
    coalesce(q.paid_at, q.updated_at, q.created_at)
  from public.quotes q
  where q.status = 'paid'
    and q.total_cents > 0
    and not exists (
      select 1 from public.quote_payments qp where qp.quote_id = q.id
    )
  returning id, quote_id
)
update public.financial_transactions ft
   set quote_payment_id = ilp.id
  from inserted_legacy_payments ilp
 where ft.quote_id = ilp.quote_id
   and ft.quote_payment_id is null;

-- 6. Sync quote_payments <-> financial_transactions
create or replace function public.sync_quote_payments_to_cashbook(p_quote_id uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_quote public.quotes%rowtype;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  select *
    into v_quote
    from public.quotes
   where id = p_quote_id;

  if not found then
    return;
  end if;

  if v_quote.status in ('draft', 'sent', 'canceled') then
    delete from public.financial_transactions ft
     where ft.quote_id = p_quote_id
       and ft.quote_payment_id is not null
       and ft.status = 'pending';
    return;
  end if;

  -- Remove pending transactions for payments with zero amount
  delete from public.financial_transactions ft
   using public.quote_payments qp
   where ft.quote_payment_id = qp.id
     and qp.quote_id = p_quote_id
     and qp.amount_cents <= 0
     and ft.status = 'pending';

  insert into public.financial_transactions (
    type,
    status,
    description,
    category,
    amount_cents,
    due_date,
    paid_at,
    billing_month,
    quote_id,
    quote_payment_id
  )
  select
    'income'::public.transaction_type,
    qp.status,
    format(
      'Orçamento #%s · %s (%s)',
      lpad(v_quote.quote_number::text, 3, '0'),
      v_quote.client_name,
      qp.label
    ),
    'Serviços / Orçamentos',
    qp.amount_cents,
    coalesce(
      qp.due_date,
      case
        when qp.paid_at is not null then (qp.paid_at at time zone 'America/Sao_Paulo')::date
        else v_today
      end
    ),
    case when qp.status = 'paid' then coalesce(qp.paid_at, now()) else null end,
    to_char(
      coalesce(
        qp.due_date,
        case
          when qp.paid_at is not null then (qp.paid_at at time zone 'America/Sao_Paulo')::date
          else v_today
        end
      ),
      'YYYY-MM'
    ),
    v_quote.id,
    qp.id
  from public.quote_payments qp
  where qp.quote_id = p_quote_id
    and qp.amount_cents > 0
  on conflict (quote_payment_id) where quote_payment_id is not null do update
    set status = excluded.status,
        description = excluded.description,
        amount_cents = excluded.amount_cents,
        due_date = excluded.due_date,
        paid_at = excluded.paid_at,
        billing_month = excluded.billing_month;
end;
$$;

-- 7. Recalculate pending installment amounts in integer cents when quotes.total_cents changes
create or replace function public.recalculate_quote_payments_for_total(p_quote_id uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_quote public.quotes%rowtype;
  v_paid_sum integer := 0;
  v_paid_count integer := 0;
  v_total_count integer := 0;
  v_pending_count integer := 0;
  v_old_pending_sum integer := 0;
  v_remaining integer := 0;
  v_deposit integer := 0;
  v_balance integer := 0;
  v_count integer := 0;
  v_base integer := 0;
  v_rem integer := 0;
  v_allocated integer := 0;
  v_idx integer := 0;
  v_next_num smallint := 1;
  v_row record;
  v_new_amount integer := 0;
begin
  select *
    into v_quote
    from public.quotes
   where id = p_quote_id;

  if not found or v_quote.status = 'paid' then
    return;
  end if;

  select coalesce(sum(amount_cents), 0)::integer,
         count(*)::integer
    into v_paid_sum, v_paid_count
    from public.quote_payments
   where quote_id = p_quote_id
     and status = 'paid';

  if v_quote.total_cents < v_paid_sum then
    raise exception 'O total do orçamento (%) não pode ser menor que o valor já recebido (%).',
      public.format_brl_cents(v_quote.total_cents),
      public.format_brl_cents(v_paid_sum);
  end if;

  v_remaining := v_quote.total_cents - v_paid_sum;

  select count(*)::integer,
         count(*) filter (where status = 'pending')::integer,
         coalesce(sum(amount_cents) filter (where status = 'pending'), 0)::integer
    into v_total_count, v_pending_count, v_old_pending_sum
    from public.quote_payments
   where quote_id = p_quote_id;

  if v_total_count = 0 then
    if v_quote.total_cents > 0 then
      if v_quote.payment_mode = 'cash' then
        insert into public.quote_payments (quote_id, installment_number, label, amount_cents)
        values (p_quote_id, 1, 'Pagamento à vista', v_quote.total_cents);
      elsif v_quote.payment_mode = 'split' then
        v_deposit := round((v_quote.total_cents::numeric * v_quote.payment_deposit_percent) / 100.0)::integer;
        v_balance := v_quote.total_cents - v_deposit;
        insert into public.quote_payments (quote_id, installment_number, label, amount_cents)
        values
          (p_quote_id, 1, format('Entrada (%s%%)', v_quote.payment_deposit_percent), v_deposit),
          (p_quote_id, 2, format('Saldo (%s%%)', 100 - v_quote.payment_deposit_percent), v_balance);
      elsif v_quote.payment_mode = 'installments' then
        v_count := greatest(2, v_quote.payment_installments_count);
        v_base := v_quote.total_cents / v_count;
        v_rem := v_quote.total_cents % v_count;
        for v_idx in 1..v_count loop
          insert into public.quote_payments (quote_id, installment_number, label, amount_cents)
          values (
            p_quote_id,
            v_idx::smallint,
            format('Parcela %s/%s', v_idx, v_count),
            case when v_idx = 1 then v_base + v_rem else v_base end
          );
        end loop;
      end if;
    end if;

    perform public.sync_quote_payments_to_cashbook(p_quote_id);
    return;
  end if;

  if v_pending_count = 0 then
    if v_remaining > 0 then
      select coalesce(max(installment_number), 0)::smallint + 1
        into v_next_num
        from public.quote_payments
       where quote_id = p_quote_id;

      insert into public.quote_payments (quote_id, installment_number, label, amount_cents)
      values (p_quote_id, v_next_num, 'Saldo complementar', v_remaining);
    end if;

    perform public.sync_quote_payments_to_cashbook(p_quote_id);
    return;
  end if;

  if v_quote.payment_mode = 'split' and v_paid_count = 0 and v_pending_count = 2 then
    v_deposit := round((v_quote.total_cents::numeric * v_quote.payment_deposit_percent) / 100.0)::integer;
    v_balance := v_quote.total_cents - v_deposit;
    v_idx := 0;
    for v_row in
      select id
        from public.quote_payments
       where quote_id = p_quote_id
         and status = 'pending'
       order by installment_number asc
    loop
      v_idx := v_idx + 1;
      update public.quote_payments
         set amount_cents = case when v_idx = 1 then v_deposit else v_balance end
       where id = v_row.id;
    end loop;
  elsif v_quote.payment_mode = 'custom' and v_old_pending_sum > 0 then
    v_idx := 0;
    v_allocated := 0;
    for v_row in
      select id, amount_cents
        from public.quote_payments
       where quote_id = p_quote_id
         and status = 'pending'
       order by installment_number asc
    loop
      v_idx := v_idx + 1;
      if v_idx = v_pending_count then
        v_new_amount := greatest(0, v_remaining - v_allocated);
      else
        v_new_amount := round((v_row.amount_cents::numeric * v_remaining) / v_old_pending_sum)::integer;
        v_new_amount := least(v_new_amount, greatest(0, v_remaining - v_allocated));
        v_allocated := v_allocated + v_new_amount;
      end if;

      update public.quote_payments
         set amount_cents = v_new_amount
       where id = v_row.id;
    end loop;
  else
    v_base := v_remaining / v_pending_count;
    v_rem := v_remaining % v_pending_count;
    v_idx := 0;
    for v_row in
      select id
        from public.quote_payments
       where quote_id = p_quote_id
         and status = 'pending'
       order by installment_number asc
    loop
      v_idx := v_idx + 1;
      update public.quote_payments
         set amount_cents = case when v_idx = 1 then v_base + v_rem else v_base end
       where id = v_row.id;
    end loop;
  end if;

  perform public.sync_quote_payments_to_cashbook(p_quote_id);
end;
$$;

-- 8. Quote BEFORE/AFTER triggers handling status guards, total recalculation & cashbook sync
create or replace function public.prepare_quote_before_write()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.total_cents := greatest(0, new.subtotal_cents + new.adversity_fee_cents - new.discount_cents);

  if tg_op = 'UPDATE'
     and new.status in ('draft', 'sent', 'canceled')
     and old.status is distinct from new.status
     and exists (
       select 1 from public.quote_payments qp
        where qp.quote_id = new.id
          and qp.status = 'paid'
     ) then
    raise exception 'Não é possível alterar para este status enquanto houver parcelas pagas. Reabra as parcelas pagas antes.';
  end if;

  if new.status = 'completed' and (tg_op = 'INSERT' or old.status is distinct from 'completed') then
    new.completed_at := coalesce(new.completed_at, now());
  elsif new.status in ('draft', 'sent', 'approved', 'canceled')
    and tg_op = 'UPDATE'
    and old.status = 'completed' then
    new.completed_at := null;
  end if;

  if new.status = 'paid' and (tg_op = 'INSERT' or old.status is distinct from 'paid') then
    new.paid_at := coalesce(new.paid_at, now());
  elsif new.status is distinct from 'paid' and tg_op = 'UPDATE' and old.status = 'paid' then
    new.paid_at := null;
  end if;

  return new;
end;
$$;

create or replace function public.create_cashbook_entry_on_quote_paid()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_paid_ts timestamptz;
  v_br_date date;
  v_payment_count integer := 0;
begin
  -- When total changes on an editable quote, recalculate pending installments and resync cashbook
  if new.total_cents is distinct from old.total_cents and new.status <> 'paid' then
    perform public.recalculate_quote_payments_for_total(new.id);
  end if;

  -- Status transitions
  if new.status is distinct from old.status then
    if new.status = 'paid' and new.total_cents > 0 then
      v_paid_ts := coalesce(new.paid_at, now());
      v_br_date := (v_paid_ts at time zone 'America/Sao_Paulo')::date;

      select count(*)::integer
        into v_payment_count
        from public.quote_payments qp
       where qp.quote_id = new.id;

      if v_payment_count = 0 then
        insert into public.quote_payments (
          quote_id,
          installment_number,
          label,
          amount_cents,
          due_date,
          status,
          paid_at
        )
        values (
          new.id,
          1,
          'Pagamento à vista',
          new.total_cents,
          v_br_date,
          'paid',
          v_paid_ts
        );
      else
        update public.quote_payments
           set status = 'paid',
               paid_at = coalesce(paid_at, v_paid_ts),
               due_date = coalesce(due_date, v_br_date)
         where quote_id = new.id
           and status = 'pending';
      end if;

      perform public.sync_quote_payments_to_cashbook(new.id);
    elsif new.status in ('approved', 'completed') then
      select count(*)::integer
        into v_payment_count
        from public.quote_payments qp
       where qp.quote_id = new.id;

      if v_payment_count = 0 and new.total_cents > 0 then
        perform public.recalculate_quote_payments_for_total(new.id);
      else
        perform public.sync_quote_payments_to_cashbook(new.id);
      end if;
    elsif new.status in ('draft', 'sent', 'canceled') then
      perform public.sync_quote_payments_to_cashbook(new.id);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_quotes_create_cashbook_entry_on_paid on public.quotes;
create trigger trg_quotes_create_cashbook_entry_on_paid
  after update of status, total_cents
  on public.quotes
  for each row execute function public.create_cashbook_entry_on_quote_paid();

-- 9. Atomic RPC: save structured payment plan on a quote
create or replace function public.save_quote_payment_plan(
  p_quote_id uuid,
  p_payment_mode public.payment_mode,
  p_deposit_percent smallint default 50,
  p_installments_count smallint default 1,
  p_payment_terms text default null,
  p_installments jsonb default '[]'::jsonb
)
returns setof public.quote_payments
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_quote public.quotes%rowtype;
  v_paid_sum integer := 0;
  v_max_paid_num smallint := 0;
  v_pending_sum integer := 0;
  v_incoming_count integer := 0;
  v_keep_ids uuid[] := '{}'::uuid[];
  v_paid_ids uuid[] := '{}'::uuid[];
  v_elem jsonb;
  v_item_id uuid;
  v_label text;
  v_amount integer;
  v_due_date date;
  v_next_num smallint := 0;
begin
  select *
    into v_quote
    from public.quotes
   where id = p_quote_id
   for update;

  if not found then
    raise exception 'Orçamento não encontrado.';
  end if;

  if v_quote.status in ('paid', 'canceled') then
    raise exception 'Este orçamento está bloqueado e não permite alterar o pagamento.';
  end if;

  if p_deposit_percent < 1 or p_deposit_percent > 99 then
    raise exception 'O percentual de entrada deve ficar entre 1%% e 99%%.';
  end if;

  if p_installments_count < 1 or p_installments_count > 24 then
    raise exception 'O número de parcelas deve ficar entre 1 e 24.';
  end if;

  if jsonb_typeof(coalesce(p_installments, '[]'::jsonb)) <> 'array' then
    raise exception 'Lista de parcelas inválida.';
  end if;

  select coalesce(array_agg(id), '{}'::uuid[]),
         coalesce(sum(amount_cents), 0)::integer,
         coalesce(max(installment_number), 0)::smallint
    into v_paid_ids, v_paid_sum, v_max_paid_num
    from public.quote_payments
   where quote_id = p_quote_id
     and status = 'paid';

  for v_elem in select * from jsonb_array_elements(coalesce(p_installments, '[]'::jsonb))
  loop
    v_item_id := nullif(trim(coalesce(v_elem->>'id', '')), '')::uuid;
    if v_item_id is not null and v_item_id = any(v_paid_ids) then
      continue;
    end if;

    v_incoming_count := v_incoming_count + 1;
    v_amount := coalesce((v_elem->>'amount_cents')::integer, 0);
    if v_amount < 0 then
      raise exception 'O valor da parcela não pode ser negativo.';
    end if;

    if v_quote.total_cents > 0 then
      v_pending_sum := v_pending_sum + v_amount;
    end if;

    if v_item_id is not null then
      v_keep_ids := array_append(v_keep_ids, v_item_id);
    end if;
  end loop;

  if v_quote.total_cents > 0 then
    if not (p_payment_mode = 'custom' and v_incoming_count = 0 and v_paid_sum = 0) then
      if v_paid_sum + v_pending_sum <> v_quote.total_cents then
        raise exception 'A soma das parcelas (%) deve ser igual ao total do orçamento (%).',
          public.format_brl_cents(v_paid_sum + v_pending_sum),
          public.format_brl_cents(v_quote.total_cents);
      end if;
    end if;
  end if;

  update public.quotes
     set payment_mode = p_payment_mode,
         payment_deposit_percent = p_deposit_percent,
         payment_installments_count = p_installments_count,
         payment_terms = nullif(trim(coalesce(p_payment_terms, '')), '')
   where id = p_quote_id;

  delete from public.quote_payments
   where quote_id = p_quote_id
     and status = 'pending'
     and not (id = any(v_keep_ids));

  -- Offset remaining pending installment numbers before renumbering sequentially
  update public.quote_payments
     set installment_number = (installment_number + 1000)::smallint
   where quote_id = p_quote_id
     and status = 'pending';

  v_next_num := v_max_paid_num;

  for v_elem in select * from jsonb_array_elements(coalesce(p_installments, '[]'::jsonb))
  loop
    v_item_id := nullif(trim(coalesce(v_elem->>'id', '')), '')::uuid;
    if v_item_id is not null and v_item_id = any(v_paid_ids) then
      continue;
    end if;

    v_next_num := v_next_num + 1;
    v_label := coalesce(nullif(trim(coalesce(v_elem->>'label', '')), ''), format('Parcela %s', v_next_num));
    v_amount := case
      when v_quote.total_cents = 0 then 0
      else coalesce((v_elem->>'amount_cents')::integer, 0)
    end;
    v_due_date := nullif(trim(coalesce(v_elem->>'due_date', '')), '')::date;

    if v_item_id is not null and exists (
      select 1 from public.quote_payments where id = v_item_id and quote_id = p_quote_id and status = 'pending'
    ) then
      update public.quote_payments
         set installment_number = v_next_num,
             label = v_label,
             amount_cents = v_amount,
             due_date = v_due_date
       where id = v_item_id;
    else
      insert into public.quote_payments (
        quote_id,
        installment_number,
        label,
        amount_cents,
        due_date,
        status
      )
      values (
        p_quote_id,
        v_next_num,
        v_label,
        v_amount,
        v_due_date,
        'pending'
      );
    end if;
  end loop;

  perform public.sync_quote_payments_to_cashbook(p_quote_id);

  return query
    select *
      from public.quote_payments
     where quote_id = p_quote_id
     order by installment_number asc;
end;
$$;

grant execute on function public.save_quote_payment_plan(uuid, public.payment_mode, smallint, smallint, text, jsonb) to authenticated;

-- 10. Atomic RPC: settle or reopen a single quote payment installment
create or replace function public.set_quote_payment_status(
  p_quote_payment_id uuid,
  p_status public.transaction_status,
  p_paid_at timestamptz default null
)
returns public.quote_payments
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_payment public.quote_payments%rowtype;
  v_quote public.quotes%rowtype;
  v_paid_ts timestamptz;
  v_br_date date;
  v_total_count integer := 0;
  v_paid_count integer := 0;
  v_paid_sum integer := 0;
begin
  select *
    into v_payment
    from public.quote_payments
   where id = p_quote_payment_id
   for update;

  if not found then
    raise exception 'Parcela não encontrada.';
  end if;

  select *
    into v_quote
    from public.quotes
   where id = v_payment.quote_id
   for update;

  if v_quote.status = 'canceled' then
    raise exception 'Orçamentos cancelados não permitem alterar recebimentos.';
  end if;

  if p_status = 'paid' and v_payment.amount_cents <= 0 then
    raise exception 'Adicione itens ao orçamento antes de confirmar o recebimento desta parcela.';
  end if;

  if p_status = 'paid' then
    v_paid_ts := coalesce(p_paid_at, v_payment.paid_at, now());
    v_br_date := (v_paid_ts at time zone 'America/Sao_Paulo')::date;

    update public.quote_payments
       set status = 'paid',
           paid_at = v_paid_ts,
           due_date = coalesce(due_date, v_br_date)
     where id = p_quote_payment_id
     returning * into v_payment;
  else
    update public.quote_payments
       set status = 'pending',
           paid_at = null
     where id = p_quote_payment_id
     returning * into v_payment;
  end if;

  select count(*)::integer,
         count(*) filter (where status = 'paid')::integer,
         coalesce(sum(amount_cents) filter (where status = 'paid'), 0)::integer
    into v_total_count, v_paid_count, v_paid_sum
    from public.quote_payments
   where quote_id = v_quote.id;

  if v_total_count > 0
     and v_paid_count = v_total_count
     and v_quote.total_cents > 0
     and v_paid_sum >= v_quote.total_cents then
    update public.quotes
       set status = 'paid'
     where id = v_quote.id
       and status is distinct from 'paid';
  elsif p_status = 'paid' and v_quote.status in ('draft', 'sent') then
    update public.quotes
       set status = 'approved'
     where id = v_quote.id;
  elsif p_status = 'pending' and v_quote.status = 'paid' then
    update public.quotes
       set status = case when completed_at is not null then 'completed' else 'approved' end
     where id = v_quote.id;
  end if;

  perform public.sync_quote_payments_to_cashbook(v_quote.id);

  return v_payment;
end;
$$;

grant execute on function public.set_quote_payment_status(uuid, public.transaction_status, timestamptz) to authenticated;

-- 11. Avoid duplicate quote_unpaid alerts when completed quote already tracks pending installments by due date
create or replace function public.sync_notifications()
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_today date := (v_now at time zone 'America/Sao_Paulo')::date;
  v_current_month text := to_char(v_today, 'YYYY-MM');
  v_prefs public.notification_preferences%rowtype;
  v_active_count integer := 0;
begin
  perform public.generate_monthly_recurring_transactions(v_current_month);

  insert into public.notification_preferences (id)
  values (1)
  on conflict (id) do nothing;

  select *
    into v_prefs
    from public.notification_preferences
   where id = 1;

  create temp table if not exists tmp_notification_candidates (
    dedupe_key text primary key,
    category public.notification_category not null,
    severity public.notification_severity not null,
    stage text not null,
    stage_rank smallint not null,
    title text not null,
    body text not null,
    action_url text not null,
    entity_type text not null,
    entity_id uuid not null,
    amount_cents integer,
    reference_date date
  ) on commit drop;

  truncate table tmp_notification_candidates;

  -- A. Monthly contract receivables
  if v_prefs.contract_due_enabled then
    insert into tmp_notification_candidates (
      dedupe_key,
      category,
      severity,
      stage,
      stage_rank,
      title,
      body,
      action_url,
      entity_type,
      entity_id,
      amount_cents,
      reference_date
    )
    select
      'contract_due:' || ft.id::text,
      'contract_due'::public.notification_category,
      case
        when ft.due_date < v_today then 'critical'::public.notification_severity
        when ft.due_date = v_today then 'warning'::public.notification_severity
        else 'info'::public.notification_severity
      end,
      case
        when ft.due_date < v_today then 'overdue'
        when ft.due_date = v_today then 'due_today'
        else 'upcoming'
      end,
      case
        when ft.due_date < v_today then 3
        when ft.due_date = v_today then 2
        else 1
      end,
      case
        when ft.due_date < v_today then format('%s: contrato atrasado', coalesce(c.client_name, ft.description))
        when ft.due_date = v_today then format('%s: contrato vence hoje', coalesce(c.client_name, ft.description))
        else format('%s: contrato a vencer', coalesce(c.client_name, ft.description))
      end,
      case
        when ft.due_date < v_today then format(
          'Mensalidade de %s venceu %s (%s).',
          public.format_brl_cents(ft.amount_cents),
          case
            when (v_today - ft.due_date) = 1 then 'há 1 dia'
            else format('há %s dias', v_today - ft.due_date)
          end,
          to_char(ft.due_date, 'DD/MM/YYYY')
        )
        when ft.due_date = v_today then format(
          'Mensalidade de %s prevista para hoje (%s).',
          public.format_brl_cents(ft.amount_cents),
          to_char(ft.due_date, 'DD/MM/YYYY')
        )
        else format(
          'Mensalidade de %s vence %s (%s).',
          public.format_brl_cents(ft.amount_cents),
          case
            when (ft.due_date - v_today) = 1 then 'amanhã'
            else format('em %s dias', ft.due_date - v_today)
          end,
          to_char(ft.due_date, 'DD/MM/YYYY')
        )
      end,
      format(
        '/finance?month=%s&filter=%s',
        ft.billing_month,
        case when ft.due_date < v_today then 'overdue' else 'pending' end
      ),
      'financial_transaction',
      ft.id,
      ft.amount_cents,
      ft.due_date
    from public.financial_transactions ft
    left join public.contracts c on c.id = ft.contract_id
    where ft.status = 'pending'
      and ft.contract_id is not null
      and ft.due_date <= (v_today + v_prefs.contract_advance_days);
  end if;

  -- B. Cashbook bills & receivables excluding monthly contracts
  if v_prefs.finance_due_enabled then
    insert into tmp_notification_candidates (
      dedupe_key,
      category,
      severity,
      stage,
      stage_rank,
      title,
      body,
      action_url,
      entity_type,
      entity_id,
      amount_cents,
      reference_date
    )
    select
      'finance_due:' || ft.id::text,
      'finance_due'::public.notification_category,
      case
        when ft.due_date < v_today then 'critical'::public.notification_severity
        when ft.due_date = v_today then 'warning'::public.notification_severity
        else 'info'::public.notification_severity
      end,
      case
        when ft.due_date < v_today then 'overdue'
        when ft.due_date = v_today then 'due_today'
        else 'upcoming'
      end,
      case
        when ft.due_date < v_today then 3
        when ft.due_date = v_today then 2
        else 1
      end,
      case
        when ft.due_date < v_today then
          case
            when ft.type = 'expense' then format('%s: conta atrasada', ft.description)
            else format('%s: recebimento atrasado', ft.description)
          end
        when ft.due_date = v_today then
          case
            when ft.type = 'expense' then format('%s: vence hoje', ft.description)
            else format('%s: recebimento hoje', ft.description)
          end
        else
          case
            when ft.type = 'expense' then format(
              '%s: vence %s',
              ft.description,
              case
                when (ft.due_date - v_today) = 1 then 'amanhã'
                else format('em %s dias', ft.due_date - v_today)
              end
            )
            else format(
              '%s: recebimento %s',
              ft.description,
              case
                when (ft.due_date - v_today) = 1 then 'amanhã'
                else format('em %s dias', ft.due_date - v_today)
              end
            )
          end
      end,
      case
        when ft.due_date < v_today then format(
          '%s de %s venceu %s (%s).',
          case when ft.type = 'expense' then 'Despesa' else 'Receita' end,
          public.format_brl_cents(ft.amount_cents),
          case
            when (v_today - ft.due_date) = 1 then 'há 1 dia'
            else format('há %s dias', v_today - ft.due_date)
          end,
          to_char(ft.due_date, 'DD/MM/YYYY')
        )
        when ft.due_date = v_today then format(
          '%s de %s com vencimento hoje (%s).',
          case when ft.type = 'expense' then 'Despesa' else 'Receita' end,
          public.format_brl_cents(ft.amount_cents),
          to_char(ft.due_date, 'DD/MM/YYYY')
        )
        else format(
          '%s de %s prevista para %s.',
          case when ft.type = 'expense' then 'Despesa' else 'Receita' end,
          public.format_brl_cents(ft.amount_cents),
          to_char(ft.due_date, 'DD/MM/YYYY')
        )
      end,
      format(
        '/finance?month=%s&filter=%s',
        ft.billing_month,
        case when ft.due_date < v_today then 'overdue' else 'pending' end
      ),
      'financial_transaction',
      ft.id,
      ft.amount_cents,
      ft.due_date
    from public.financial_transactions ft
    where ft.status = 'pending'
      and ft.contract_id is null
      and ft.due_date <= (v_today + v_prefs.finance_advance_days);
  end if;

  -- C. Completed quotes awaiting payment without scheduled installment alerts
  if v_prefs.quote_unpaid_enabled then
    insert into tmp_notification_candidates (
      dedupe_key,
      category,
      severity,
      stage,
      stage_rank,
      title,
      body,
      action_url,
      entity_type,
      entity_id,
      amount_cents,
      reference_date
    )
    select
      'quote_unpaid:' || q.id::text,
      'quote_unpaid'::public.notification_category,
      case
        when (v_today - ((coalesce(q.completed_at, q.updated_at, q.created_at) at time zone 'America/Sao_Paulo')::date))
          >= greatest(v_prefs.quote_completed_unpaid_days + 6, 7)
          then 'critical'::public.notification_severity
        else 'warning'::public.notification_severity
      end,
      case
        when (v_today - ((coalesce(q.completed_at, q.updated_at, q.created_at) at time zone 'America/Sao_Paulo')::date))
          >= greatest(v_prefs.quote_completed_unpaid_days + 6, 7)
          then 'completed_unpaid_overdue'
        else 'completed_unpaid'
      end,
      case
        when (v_today - ((coalesce(q.completed_at, q.updated_at, q.created_at) at time zone 'America/Sao_Paulo')::date))
          >= greatest(v_prefs.quote_completed_unpaid_days + 6, 7)
          then 3
        else 2
      end,
      format(
        '%s ainda não pagou (#%s)',
        q.client_name,
        lpad(q.quote_number::text, 3, '0')
      ),
      format(
        'Serviço concluído %s, %s aguardando pagamento.',
        case
          when (v_today - ((coalesce(q.completed_at, q.updated_at, q.created_at) at time zone 'America/Sao_Paulo')::date)) = 0
            then 'hoje'
          when (v_today - ((coalesce(q.completed_at, q.updated_at, q.created_at) at time zone 'America/Sao_Paulo')::date)) = 1
            then 'há 1 dia'
          else format(
            'há %s dias',
            v_today - ((coalesce(q.completed_at, q.updated_at, q.created_at) at time zone 'America/Sao_Paulo')::date)
          )
        end,
        public.format_brl_cents(q.total_cents)
      ),
      '/quotes/' || q.id::text,
      'quote',
      q.id,
      q.total_cents,
      (coalesce(q.completed_at, q.updated_at, q.created_at) at time zone 'America/Sao_Paulo')::date
    from public.quotes q
    where q.status = 'completed'
      and not exists (
        select 1
          from public.financial_transactions ft
         where ft.quote_id = q.id
           and ft.quote_payment_id is not null
           and ft.status = 'pending'
      )
      and (v_today - ((coalesce(q.completed_at, q.updated_at, q.created_at) at time zone 'America/Sao_Paulo')::date))
        >= v_prefs.quote_completed_unpaid_days;
  end if;

  -- D. Stale open quotes (draft, sent/expired, approved)
  if v_prefs.quote_stale_enabled then
    insert into tmp_notification_candidates (
      dedupe_key,
      category,
      severity,
      stage,
      stage_rank,
      title,
      body,
      action_url,
      entity_type,
      entity_id,
      amount_cents,
      reference_date
    )
    select
      'quote_stale:' || q.id::text,
      'quote_stale'::public.notification_category,
      case
        when q.status = 'draft' then 'info'::public.notification_severity
        else 'warning'::public.notification_severity
      end,
      case
        when q.status = 'draft' then 'draft_stale'
        when q.status = 'sent' and q.valid_until is not null and q.valid_until < v_today then 'sent_expired'
        when q.status = 'sent' then 'sent_stale'
        else 'approved_stale'
      end,
      case
        when q.status = 'draft' then 1
        else 2
      end,
      case
        when q.status = 'draft' then format(
          'Rascunho de %s em aberto há %s (#%s)',
          q.client_name,
          case
            when (v_today - (q.updated_at at time zone 'America/Sao_Paulo')::date) = 1 then '1 dia'
            else format('%s dias', v_today - (q.updated_at at time zone 'America/Sao_Paulo')::date)
          end,
          lpad(q.quote_number::text, 3, '0')
        )
        when q.status = 'sent' and q.valid_until is not null and q.valid_until < v_today then format(
          'Orçamento de %s venceu (#%s)',
          q.client_name,
          lpad(q.quote_number::text, 3, '0')
        )
        when q.status = 'sent' then format(
          'Orçamento de %s em aberto há %s (#%s)',
          q.client_name,
          case
            when (v_today - (q.updated_at at time zone 'America/Sao_Paulo')::date) = 1 then '1 dia'
            else format('%s dias', v_today - (q.updated_at at time zone 'America/Sao_Paulo')::date)
          end,
          lpad(q.quote_number::text, 3, '0')
        )
        else format(
          'Orçamento de %s aprovado há %s (#%s)',
          q.client_name,
          case
            when (v_today - (q.updated_at at time zone 'America/Sao_Paulo')::date) = 1 then '1 dia'
            else format('%s dias', v_today - (q.updated_at at time zone 'America/Sao_Paulo')::date)
          end,
          lpad(q.quote_number::text, 3, '0')
        )
      end,
      case
        when q.status = 'draft' then format(
          'Orçamento de %s sem atualização desde %s.',
          public.format_brl_cents(q.total_cents),
          to_char((q.updated_at at time zone 'America/Sao_Paulo')::date, 'DD/MM/YYYY')
        )
        when q.status = 'sent' and q.valid_until is not null and q.valid_until < v_today then format(
          'Proposta enviada de %s venceu %s (%s).',
          public.format_brl_cents(q.total_cents),
          case
            when (v_today - q.valid_until) = 1 then 'há 1 dia'
            else format('há %s dias', v_today - q.valid_until)
          end,
          to_char(q.valid_until, 'DD/MM/YYYY')
        )
        when q.status = 'sent' then format(
          'Proposta enviada de %s sem atualização.',
          public.format_brl_cents(q.total_cents)
        )
        else format(
          'Serviço de %s aprovado e aguardando conclusão.',
          public.format_brl_cents(q.total_cents)
        )
      end,
      '/quotes/' || q.id::text,
      'quote',
      q.id,
      q.total_cents,
      case
        when q.status = 'sent' and q.valid_until is not null and q.valid_until < v_today then q.valid_until
        else (q.updated_at at time zone 'America/Sao_Paulo')::date
      end
    from public.quotes q
    where (
      q.status = 'draft'
      and (v_today - (q.updated_at at time zone 'America/Sao_Paulo')::date) >= v_prefs.quote_draft_stale_days
    )
    or (
      q.status = 'sent'
      and (
        (q.valid_until is not null and q.valid_until < v_today)
        or (v_today - (q.updated_at at time zone 'America/Sao_Paulo')::date) >= v_prefs.quote_sent_stale_days
      )
    )
    or (
      q.status = 'approved'
      and (v_today - (q.updated_at at time zone 'America/Sao_Paulo')::date) >= v_prefs.quote_approved_stale_days
    );
  end if;

  -- Upsert active candidates; re-open resolved alerts and re-unread escalated stages
  insert into public.notifications (
    dedupe_key,
    category,
    severity,
    stage,
    stage_rank,
    title,
    body,
    action_url,
    entity_type,
    entity_id,
    amount_cents,
    reference_date
  )
  select
    c.dedupe_key,
    c.category,
    c.severity,
    c.stage,
    c.stage_rank,
    c.title,
    c.body,
    c.action_url,
    c.entity_type,
    c.entity_id,
    c.amount_cents,
    c.reference_date
  from tmp_notification_candidates c
  on conflict (dedupe_key) do update
    set category = excluded.category,
        severity = excluded.severity,
        stage = excluded.stage,
        stage_rank = excluded.stage_rank,
        title = excluded.title,
        body = excluded.body,
        action_url = excluded.action_url,
        entity_type = excluded.entity_type,
        entity_id = excluded.entity_id,
        amount_cents = excluded.amount_cents,
        reference_date = excluded.reference_date,
        resolved_at = null,
        read_at = case
          when public.notifications.resolved_at is not null then null
          when excluded.stage_rank > public.notifications.stage_rank then null
          else public.notifications.read_at
        end,
        snoozed_until = case
          when public.notifications.resolved_at is not null then null
          when excluded.stage_rank > public.notifications.stage_rank then null
          else public.notifications.snoozed_until
        end,
        last_pushed_stage = case
          when public.notifications.resolved_at is not null then null
          else public.notifications.last_pushed_stage
        end
  where public.notifications.resolved_at is not null
     or public.notifications.stage is distinct from excluded.stage
     or public.notifications.severity is distinct from excluded.severity
     or public.notifications.title is distinct from excluded.title
     or public.notifications.body is distinct from excluded.body
     or public.notifications.action_url is distinct from excluded.action_url
     or public.notifications.amount_cents is distinct from excluded.amount_cents
     or public.notifications.reference_date is distinct from excluded.reference_date;

  -- Auto-resolve notifications whose underlying condition is no longer active
  update public.notifications n
     set resolved_at = v_now
   where n.resolved_at is null
     and not exists (
       select 1
         from tmp_notification_candidates c
        where c.dedupe_key = n.dedupe_key
     );

  select count(*)::integer
    into v_active_count
    from public.notifications
   where resolved_at is null;

  return v_active_count;
end;
$$;
