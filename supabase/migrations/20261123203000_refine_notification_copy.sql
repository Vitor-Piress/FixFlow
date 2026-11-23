-- Refine notification copy to lead with client/item name for direct lock-screen readability

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
