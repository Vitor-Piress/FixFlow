-- ============================================================================
-- FixFlow: Trigger quote payment recalculation on quote subtotal / adjustments
-- ============================================================================
-- PostgreSQL AFTER UPDATE OF <columns> triggers only inspect columns explicitly
-- assigned in the UPDATE SET list, not columns modified by BEFORE UPDATE
-- triggers (such as quotes.total_cents when quote_items update subtotal_cents).
-- Listen on subtotal_cents, adversity_fee_cents, discount_cents and total_cents
-- so adding/editing/removing items or discounts/fees always recalculates
-- pending quote_payments and keeps the cashbook in sync.

drop trigger if exists trg_quotes_create_cashbook_entry_on_paid on public.quotes;
create trigger trg_quotes_create_cashbook_entry_on_paid
  after update of status, subtotal_cents, adversity_fee_cents, discount_cents, total_cents
  on public.quotes
  for each row execute function public.create_cashbook_entry_on_quote_paid();

-- Repair any existing open quote whose total_cents diverged from its pending
-- quote_payments before this trigger fix.
do $$
declare
  v_quote_id uuid;
begin
  for v_quote_id in
    select q.id
      from public.quotes q
     where q.status <> 'paid'
       and q.total_cents > 0
       and exists (
         select 1
           from public.quote_payments qp
          where qp.quote_id = q.id
            and qp.status = 'pending'
       )
       and coalesce(
         (
           select sum(qp.amount_cents)
             from public.quote_payments qp
            where qp.quote_id = q.id
         ),
         0
       ) <> q.total_cents
  loop
    perform public.recalculate_quote_payments_for_total(v_quote_id);
  end loop;
end
$$;
