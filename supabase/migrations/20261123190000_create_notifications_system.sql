-- FixFlow: Notifications center, preferences, push subscriptions, and scheduled dispatch

-- 1. Track quote completion date so unpaid completed alerts measure days accurately
alter table public.quotes
  add column if not exists completed_at timestamptz;

update public.quotes
   set completed_at = coalesce(completed_at, updated_at, created_at)
 where status = 'completed'
   and completed_at is null;

create or replace function public.prepare_quote_before_write()
returns trigger
language plpgsql
as $$
begin
  new.total_cents := greatest(0, new.subtotal_cents + new.adversity_fee_cents - new.discount_cents);

  if new.status = 'completed' and (tg_op = 'INSERT' or old.status is distinct from 'completed') then
    new.completed_at := coalesce(new.completed_at, now());
  elsif new.status in ('draft', 'sent', 'approved', 'canceled')
    and tg_op = 'UPDATE'
    and old.status = 'completed' then
    new.completed_at := null;
  end if;

  if new.status = 'paid' and (tg_op = 'INSERT' or old.status is distinct from 'paid') then
    new.paid_at := coalesce(new.paid_at, now());
  end if;

  return new;
end;
$$;

-- 2. Notification enums
do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'notification_category'
  ) then
    create type public.notification_category as enum (
      'finance_due',
      'contract_due',
      'quote_unpaid',
      'quote_stale'
    );
  end if;

  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'notification_severity'
  ) then
    create type public.notification_severity as enum (
      'info',
      'warning',
      'critical'
    );
  end if;
end
$$;

-- 3. Singleton notification preferences (balanced defaults)
create table if not exists public.notification_preferences (
  id smallint primary key default 1 check (id = 1),
  finance_due_enabled boolean not null default true,
  contract_due_enabled boolean not null default true,
  quote_unpaid_enabled boolean not null default true,
  quote_stale_enabled boolean not null default true,
  finance_advance_days smallint not null default 3 check (finance_advance_days between 0 and 30),
  contract_advance_days smallint not null default 3 check (contract_advance_days between 0 and 30),
  quote_completed_unpaid_days smallint not null default 1 check (quote_completed_unpaid_days between 0 and 60),
  quote_draft_stale_days smallint not null default 3 check (quote_draft_stale_days between 1 and 90),
  quote_sent_stale_days smallint not null default 7 check (quote_sent_stale_days between 1 and 90),
  quote_approved_stale_days smallint not null default 14 check (quote_approved_stale_days between 1 and 180),
  push_morning_enabled boolean not null default true,
  push_evening_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_notification_preferences_updated_at on public.notification_preferences;
create trigger trg_notification_preferences_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();

alter table public.notification_preferences enable row level security;

drop policy if exists "Authenticated full access on notification_preferences" on public.notification_preferences;
create policy "Authenticated full access on notification_preferences"
  on public.notification_preferences for all to authenticated using (true) with check (true);

insert into public.notification_preferences (id)
values (1)
on conflict (id) do nothing;

-- 4. Single source of truth for In-App alerts and Web Push digests
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text not null unique,
  category public.notification_category not null,
  severity public.notification_severity not null,
  stage text not null,
  stage_rank smallint not null default 1 check (stage_rank between 1 and 3),
  title text not null,
  body text not null,
  action_url text not null,
  entity_type text not null check (entity_type in ('financial_transaction', 'contract', 'quote')),
  entity_id uuid not null,
  amount_cents integer,
  reference_date date,
  read_at timestamptz,
  snoozed_until timestamptz,
  resolved_at timestamptz,
  last_pushed_at timestamptz,
  last_pushed_stage text,
  last_pushed_slot_date date,
  last_pushed_slot text check (last_pushed_slot is null or last_pushed_slot in ('morning', 'evening')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_notifications_active_sort
  on public.notifications (stage_rank desc, reference_date asc, updated_at desc)
  where resolved_at is null;

create index if not exists idx_notifications_unread_active
  on public.notifications (category, read_at, snoozed_until)
  where resolved_at is null;

drop trigger if exists trg_notifications_updated_at on public.notifications;
create trigger trg_notifications_updated_at
  before update on public.notifications
  for each row execute function public.set_updated_at();

alter table public.notifications enable row level security;

drop policy if exists "Authenticated full access on notifications" on public.notifications;
create policy "Authenticated full access on notifications"
  on public.notifications for all to authenticated using (true) with check (true);

-- 5. Web Push device subscriptions
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  device_label text,
  user_agent text,
  is_active boolean not null default true,
  last_success_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_user_active
  on public.push_subscriptions (user_id, is_active);

drop trigger if exists trg_push_subscriptions_updated_at on public.push_subscriptions;
create trigger trg_push_subscriptions_updated_at
  before update on public.push_subscriptions
  for each row execute function public.set_updated_at();

alter table public.push_subscriptions enable row level security;

drop policy if exists "Authenticated manage own push_subscriptions" on public.push_subscriptions;
create policy "Authenticated manage own push_subscriptions"
  on public.push_subscriptions
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 6. Integer-only BRL formatting helper for notification copy
create or replace function public.format_brl_cents(p_amount_cents integer)
returns text
language plpgsql
immutable
as $$
declare
  v_abs bigint;
  v_reais text;
  v_cents text;
  v_len integer;
  v_formatted text := '';
  v_i integer;
  v_count integer := 0;
begin
  if p_amount_cents is null then
    return null;
  end if;

  v_abs := abs(p_amount_cents::bigint);
  v_reais := (v_abs / 100)::text;
  v_cents := lpad((v_abs % 100)::text, 2, '0');
  v_len := char_length(v_reais);

  for v_i in reverse v_len..1 loop
    if v_count > 0 and v_count % 3 = 0 then
      v_formatted := '.' || v_formatted;
    end if;
    v_formatted := substr(v_reais, v_i, 1) || v_formatted;
    v_count := v_count + 1;
  end loop;

  if p_amount_cents < 0 then
    return '-R$ ' || v_formatted || ',' || v_cents;
  end if;

  return 'R$ ' || v_formatted || ',' || v_cents;
end;
$$;

-- 7. Sync alerts from current domain state, escalate stage changes, and auto-resolve settled items
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

  -- A. Monthly contract receivables (upcoming, due today, overdue)
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
        when ft.due_date < v_today then format('Contrato atrasado: %s', coalesce(c.client_name, ft.description))
        when ft.due_date = v_today then format('Contrato vence hoje: %s', coalesce(c.client_name, ft.description))
        else format('Contrato a vencer: %s', coalesce(c.client_name, ft.description))
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
            when ft.type = 'expense' then format('Conta atrasada: %s', ft.description)
            else format('Recebimento atrasado: %s', ft.description)
          end
        when ft.due_date = v_today then
          case
            when ft.type = 'expense' then format('Conta vence hoje: %s', ft.description)
            else format('Recebimento vence hoje: %s', ft.description)
          end
        else
          case
            when ft.type = 'expense' then format('Conta a vencer: %s', ft.description)
            else format('Recebimento próximo: %s', ft.description)
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
          '%s de %s vence %s (%s).',
          case when ft.type = 'expense' then 'Despesa' else 'Receita' end,
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
    where ft.status = 'pending'
      and ft.contract_id is null
      and ft.due_date <= (v_today + v_prefs.finance_advance_days);
  end if;

  -- C. Completed quotes awaiting payment
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
        'Orçamento #%s concluído sem pagamento',
        lpad(q.quote_number::text, 3, '0')
      ),
      format(
        '%s, %s aguardando baixa (%s).',
        q.client_name,
        public.format_brl_cents(q.total_cents),
        case
          when (v_today - ((coalesce(q.completed_at, q.updated_at, q.created_at) at time zone 'America/Sao_Paulo')::date)) = 0
            then 'concluído hoje'
          when (v_today - ((coalesce(q.completed_at, q.updated_at, q.created_at) at time zone 'America/Sao_Paulo')::date)) = 1
            then 'concluído há 1 dia'
          else format(
            'concluído há %s dias',
            v_today - ((coalesce(q.completed_at, q.updated_at, q.created_at) at time zone 'America/Sao_Paulo')::date)
          )
        end
      ),
      '/quotes/' || q.id::text,
      'quote',
      q.id,
      q.total_cents,
      (coalesce(q.completed_at, q.updated_at, q.created_at) at time zone 'America/Sao_Paulo')::date
    from public.quotes q
    where q.status = 'completed'
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
          'Rascunho #%s parado: %s',
          lpad(q.quote_number::text, 3, '0'),
          q.client_name
        )
        when q.status = 'sent' and q.valid_until is not null and q.valid_until < v_today then format(
          'Orçamento #%s vencido: %s',
          lpad(q.quote_number::text, 3, '0'),
          q.client_name
        )
        when q.status = 'sent' then format(
          'Orçamento #%s sem resposta: %s',
          lpad(q.quote_number::text, 3, '0'),
          q.client_name
        )
        else format(
          'Orçamento #%s aprovado sem conclusão',
          lpad(q.quote_number::text, 3, '0')
        )
      end,
      case
        when q.status = 'draft' then format(
          'Orçamento de %s em rascunho há %s.',
          public.format_brl_cents(q.total_cents),
          case
            when (v_today - (q.updated_at at time zone 'America/Sao_Paulo')::date) = 1 then '1 dia'
            else format('%s dias', v_today - (q.updated_at at time zone 'America/Sao_Paulo')::date)
          end
        )
        when q.status = 'sent' and q.valid_until is not null and q.valid_until < v_today then format(
          'Proposta de %s venceu %s (%s).',
          public.format_brl_cents(q.total_cents),
          case
            when (v_today - q.valid_until) = 1 then 'há 1 dia'
            else format('há %s dias', v_today - q.valid_until)
          end,
          to_char(q.valid_until, 'DD/MM/YYYY')
        )
        when q.status = 'sent' then format(
          'Proposta de %s enviada há %s.',
          public.format_brl_cents(q.total_cents),
          case
            when (v_today - (q.updated_at at time zone 'America/Sao_Paulo')::date) = 1 then '1 dia'
            else format('%s dias', v_today - (q.updated_at at time zone 'America/Sao_Paulo')::date)
          end
        )
        else format(
          '%s, %s aguardando execução há %s.',
          q.client_name,
          public.format_brl_cents(q.total_cents),
          case
            when (v_today - (q.updated_at at time zone 'America/Sao_Paulo')::date) = 1 then '1 dia'
            else format('%s dias', v_today - (q.updated_at at time zone 'America/Sao_Paulo')::date)
          end
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

grant execute on function public.sync_notifications() to authenticated, service_role;

-- 8. Private cron dispatcher using Supabase Vault + pg_net + pg_cron (08:00 & 18:00 BRT)
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

create schema if not exists private;
revoke all on schema private from public;

create or replace function private.invoke_push_dispatch(p_slot text)
returns bigint
language plpgsql
security definer
set search_path = private, public, extensions, vault, net
as $$
declare
  v_project_url text;
  v_cron_secret text;
  v_request_id bigint;
begin
  if p_slot not in ('morning', 'evening') then
    raise exception 'Invalid push dispatch slot: %', p_slot;
  end if;

  select decrypted_secret
    into v_project_url
    from vault.decrypted_secrets
   where name = 'fixflow_project_url'
   limit 1;

  select decrypted_secret
    into v_cron_secret
    from vault.decrypted_secrets
   where name = 'fixflow_push_cron_secret'
   limit 1;

  if coalesce(v_project_url, '') = '' or coalesce(v_cron_secret, '') = '' then
    raise notice 'Skipping push dispatch: Vault secrets fixflow_project_url or fixflow_push_cron_secret are not set.';
    return null;
  end if;

  select net.http_post(
    url := rtrim(v_project_url, '/') || '/functions/v1/push-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', v_cron_secret
    ),
    body := jsonb_build_object(
      'action', 'dispatch-scheduled',
      'slot', p_slot
    ),
    timeout_milliseconds := 10000
  )
  into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function private.invoke_push_dispatch(text) from public;

do $$
declare
  v_job_id bigint;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    for v_job_id in
      select jobid from cron.job where jobname in ('fixflow-push-morning', 'fixflow-push-evening')
    loop
      perform cron.unschedule(v_job_id);
    end loop;

    perform cron.schedule(
      'fixflow-push-morning',
      '0 11 * * *',
      $cron$select private.invoke_push_dispatch('morning');$cron$
    );

    perform cron.schedule(
      'fixflow-push-evening',
      '0 21 * * *',
      $cron$select private.invoke_push_dispatch('evening');$cron$
    );
  end if;
end
$$;
