-- ============================================================================
-- FixFlow — Limpeza completa dos dados operacionais (preserva conta e perfil)
-- ============================================================================
-- O que este script LIMPA:
--   - public.notifications
--   - public.financial_transactions
--   - public.quote_payments
--   - public.quote_items
--   - public.quotes (e reinicia a sequência quote_number para #001)
--   - public.contracts
--   - public.recurring_expenses
--   - public.materials
--   - public.services
--   - public.suppliers
--   - public.clients
--
-- O que este script PRESERVA intacto:
--   - auth.users (login e sessão do usuário no Supabase Auth)
--   - public.business_profile (dados comerciais/pessoais, chave Pix e padrões)
--   - public.notification_preferences (preferências de alertas e horários push)
--   - public.push_subscriptions (aparelhos conectados para Web Push)
--
-- IMPORTANTE sobre os PDFs de contratos (Storage):
--   O Supabase não recomenda DELETE direto em storage.objects via SQL.
--   Para remover também os PDFs do bucket privado `contract-pdfs`, execute:
--     npm run reset:data
--   ou esvazie o bucket em: Supabase Dashboard -> Storage -> contract-pdfs.
-- ============================================================================

begin;

truncate table
  public.notifications,
  public.financial_transactions,
  public.quote_payments,
  public.quote_items,
  public.quotes,
  public.contracts,
  public.recurring_expenses,
  public.materials,
  public.services,
  public.suppliers,
  public.clients
restart identity;

commit;

-- Conferência pós-limpeza (operacionais devem retornar 0; perfil e usuário preservados)
select 'auth.users (preservado)' as tabela, count(*)::integer as registros from auth.users
union all
select 'business_profile (preservado)', count(*)::integer from public.business_profile
union all
select 'notification_preferences (preservado)', count(*)::integer from public.notification_preferences
union all
select 'push_subscriptions (preservado)', count(*)::integer from public.push_subscriptions
union all
select 'clients (limpo)', count(*)::integer from public.clients
union all
select 'suppliers (limpo)', count(*)::integer from public.suppliers
union all
select 'services (limpo)', count(*)::integer from public.services
union all
select 'materials (limpo)', count(*)::integer from public.materials
union all
select 'quotes (limpo)', count(*)::integer from public.quotes
union all
select 'quote_items (limpo)', count(*)::integer from public.quote_items
union all
select 'quote_payments (limpo)', count(*)::integer from public.quote_payments
union all
select 'contracts (limpo)', count(*)::integer from public.contracts
union all
select 'recurring_expenses (limpo)', count(*)::integer from public.recurring_expenses
union all
select 'financial_transactions (limpo)', count(*)::integer from public.financial_transactions
union all
select 'notifications (limpo)', count(*)::integer from public.notifications;
