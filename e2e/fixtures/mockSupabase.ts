import fs from "node:fs";
import path from "node:path";
import type { Page, Route } from "@playwright/test";

function resolveSupabaseProjectRef(): string {
  const fromEnv = process.env.VITE_SUPABASE_URL;
  let urlValue = fromEnv ?? "";

  if (!urlValue) {
    const envPath = path.resolve(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      const match = content.match(/^VITE_SUPABASE_URL\s*=\s*(.+)$/m);
      if (match) {
        urlValue = match[1].trim().replace(/^['"]|['"]$/g, "");
      }
    }
  }

  try {
    return new URL(urlValue).hostname.split(".")[0] || "local";
  } catch {
    return "local";
  }
}

function createFakeJwt(): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      sub: "00000000-0000-4000-8000-000000000001",
      aud: "authenticated",
      role: "authenticated",
      email: "tecnico@fixflow.test",
      exp: 4102444800,
    }),
  ).toString("base64url");
  return `${header}.${payload}.mock-signature`;
}

function getCurrentBillingMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export interface MockFinanceTransactionInput {
  id: string;
  type: "income" | "expense";
  status: "pending" | "paid";
  description: string;
  category?: string | null;
  amount_cents: number;
  due_date?: string;
  paid_at?: string | null;
  notes?: string | null;
  quote_id?: string | null;
  quote_payment_id?: string | null;
  contract_id?: string | null;
  recurring_expense_id?: string | null;
}

export interface MockSupabaseOptions {
  skipSplash?: boolean;
  showItemPrices?: boolean;
  pixKey?: string | null;
  transactions?: MockFinanceTransactionInput[];
}

export async function installMockSupabase(
  page: Page,
  options: MockSupabaseOptions = {},
) {
  const projectRef = resolveSupabaseProjectRef();
  const storageKey = `sb-${projectRef}-auth-token`;
  const accessToken = createFakeJwt();
  const billingMonth = getCurrentBillingMonth();
  const dueDate = `${billingMonth}-25`;

  const fakeUser = {
    id: "00000000-0000-4000-8000-000000000001",
    aud: "authenticated",
    role: "authenticated",
    email: "tecnico@fixflow.test",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    created_at: "2026-01-01T10:00:00.000Z",
  };

  const fakeSession = {
    access_token: accessToken,
    token_type: "bearer",
    expires_in: 360000,
    expires_at: 4102444800,
    refresh_token: "mock-refresh-token",
    user: fakeUser,
  };

  let businessProfile = {
    id: 1,
    business_name: "ClimaTech Serviços Prediais",
    owner_name: "Carlos Henrique Silva",
    document: "12345678000195",
    phone: "48999998888",
    email: "contato@climatech.com.br",
    city_state: "São José - SC",
    specialties: "Climatização, elétrica e manutenção predial",
    pix_key: options.pixKey !== undefined ? options.pixKey : "12.345.678/0001-95",
    default_quote_validity_days: 15,
    default_payment_terms: "50% na aprovação e 50% na conclusão",
    default_notes: "Garantia de 90 dias sobre os serviços executados.",
    created_at: "2026-01-01T10:00:00.000Z",
    updated_at: "2026-01-01T10:00:00.000Z",
  };

  const quoteId = "11111111-1111-4111-8111-111111111111";
  const normalizePhoneDigits = (raw: string | null | undefined): string | null => {
    if (!raw) {
      return null;
    }
    let digits = raw.replace(/\D/g, "");
    if (!digits) {
      return null;
    }
    if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
      digits = digits.slice(2);
    }
    return digits;
  };

  let clients = [
    {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
      name: "Condomínio Sol & Mar",
      phone: "48998887766",
      phone_normalized: "48998887766",
      address: "Av. Beira-Mar, 420 - Campinas",
      notes: "Portaria 24h, falar com zelador Marcos",
      created_at: "2026-11-01T10:00:00.000Z",
      updated_at: "2026-11-01T10:00:00.000Z",
    },
  ];

  const quoteItems = [
    {
      id: "22222222-2222-4222-8222-222222222221",
      quote_id: quoteId,
      item_type: "service",
      service_id: "33333333-3333-4333-8333-333333333331",
      material_id: null,
      description_snapshot: "Instalação de ar-condicionado split inverter 12.000 BTUs",
      unit_snapshot: "unit",
      quantity: 2,
      unit_price_snapshot_cents: 45000,
      subtotal_cents: 90000,
      sort_order: 0,
      created_at: "2026-11-20T12:00:00.000Z",
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      quote_id: quoteId,
      item_type: "material",
      service_id: null,
      material_id: "44444444-4444-4444-8444-444444444441",
      description_snapshot: "Tubulação de cobre isolada 1/4 e 3/8",
      unit_snapshot: "linear_m",
      quantity: 6,
      unit_price_snapshot_cents: 4500,
      subtotal_cents: 27000,
      sort_order: 1,
      created_at: "2026-11-20T12:01:00.000Z",
    },
  ];

  let quotePayments: Array<{
    id: string;
    quote_id: string;
    installment_number: number;
    label: string;
    amount_cents: number;
    due_date: string | null;
    status: "pending" | "paid";
    paid_at: string | null;
    created_at: string;
    updated_at: string;
  }> = [];

  const quotes = [
    {
      id: quoteId,
      quote_number: 7,
      client_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
      client_name: "Condomínio Sol & Mar",
      client_phone: "48998887766",
      client_address: "Av. Beira-Mar, 420 - Campinas",
      title: "Climatização da sala de reuniões",
      status: "sent",
      subtotal_cents: 117000,
      adversity_fee_cents: 10000,
      adversity_reason: "Acesso externo em altura com escada extensiva",
      discount_cents: 5000,
      total_cents: 122000,
      show_item_prices: options.showItemPrices ?? true,
      valid_until: "2026-12-08",
      payment_mode: "cash",
      payment_deposit_percent: 50,
      payment_installments_count: 1,
      payment_terms: "50% na aprovação e 50% na conclusão",
      notes: "Serviço agendado para horário comercial.",
      completed_at: null as string | null,
      paid_at: null as string | null,
      created_at: "2026-11-20T12:00:00.000Z",
      updated_at: "2026-11-20T12:05:00.000Z",
    },
  ];

  let transactions: Array<{
    id: string;
    type: "income" | "expense";
    status: "pending" | "paid";
    description: string;
    category: string | null;
    amount_cents: number;
    billing_month: string;
    due_date: string;
    paid_at: string | null;
    notes: string | null;
    quote_id: string | null;
    quote_payment_id: string | null;
    contract_id: string | null;
    recurring_expense_id: string | null;
    created_at: string;
    updated_at: string;
  }> = [
    {
      id: "55555555-5555-4555-8555-555555555551",
      type: "expense",
      status: "pending",
      description: "Compra de gás refrigerante R410A",
      category: "Materiais",
      amount_cents: 32000,
      billing_month: billingMonth,
      due_date: dueDate,
      paid_at: null,
      notes: "Lançamento manual para reposição de cilindro.",
      quote_id: null,
      quote_payment_id: null,
      contract_id: null,
      recurring_expense_id: null,
      created_at: "2026-11-20T10:00:00.000Z",
      updated_at: "2026-11-20T10:00:00.000Z",
    },
    {
      id: "55555555-5555-4555-8555-555555555552",
      type: "income",
      status: "pending",
      description: "Mensalidade Clínica Vida",
      category: "Contrato mensal",
      amount_cents: 150000,
      billing_month: billingMonth,
      due_date: dueDate,
      paid_at: null,
      notes: null,
      quote_id: null,
      quote_payment_id: null,
      contract_id: "66666666-6666-4666-8666-666666666661",
      recurring_expense_id: null,
      created_at: "2026-11-01T10:00:00.000Z",
      updated_at: "2026-11-01T10:00:00.000Z",
    },
    {
      id: "55555555-5555-4555-8555-555555555553",
      type: "expense",
      status: "pending",
      description: "Internet fibra escritório",
      category: "Fixas",
      amount_cents: 11990,
      billing_month: billingMonth,
      due_date: dueDate,
      paid_at: null,
      notes: null,
      quote_id: null,
      quote_payment_id: null,
      contract_id: null,
      recurring_expense_id: "77777777-7777-4777-8777-777777777771",
      created_at: "2026-11-01T09:00:00.000Z",
      updated_at: "2026-11-01T09:00:00.000Z",
    },
    {
      id: "55555555-5555-4555-8555-555555555554",
      type: "income",
      status: "paid",
      description: "Orçamento #007 - Condomínio Sol & Mar",
      category: "Orçamento",
      amount_cents: 122000,
      billing_month: billingMonth,
      due_date: dueDate,
      paid_at: "2026-11-21T14:00:00.000Z",
      notes: null,
      quote_id: quoteId,
      quote_payment_id: null,
      contract_id: null,
      recurring_expense_id: null,
      created_at: "2026-11-21T14:00:00.000Z",
      updated_at: "2026-11-21T14:00:00.000Z",
    },
  ];

  if (options.transactions) {
    transactions = options.transactions.map((item) => ({
      id: item.id,
      type: item.type,
      status: item.status,
      description: item.description,
      category: item.category ?? null,
      amount_cents: item.amount_cents,
      billing_month: billingMonth,
      due_date: item.due_date ?? dueDate,
      paid_at:
        item.paid_at !== undefined
          ? item.paid_at
          : item.status === "paid"
            ? "2026-11-21T14:00:00.000Z"
            : null,
      notes: item.notes ?? null,
      quote_id: item.quote_id ?? null,
      quote_payment_id: item.quote_payment_id ?? null,
      contract_id: item.contract_id ?? null,
      recurring_expense_id: item.recurring_expense_id ?? null,
      created_at: "2026-11-21T14:00:00.000Z",
      updated_at: "2026-11-21T14:00:00.000Z",
    }));
  }

  const services = [
    {
      id: "33333333-3333-4333-8333-333333333331",
      name: "Instalação split 12.000 BTUs",
      category: "Climatização",
      description: "Instalação completa com vácuo e teste de pressão",
      unit: "unit",
      base_price_cents: 45000,
      is_active: true,
      created_at: "2026-11-01T10:00:00.000Z",
      updated_at: "2026-11-01T10:00:00.000Z",
    },
    {
      id: "33333333-3333-4333-8333-333333333332",
      name: "Troca de disjuntor bifásico",
      category: "Elétrica",
      description: null,
      unit: "unit",
      base_price_cents: 18000,
      is_active: true,
      created_at: "2026-11-01T10:00:00.000Z",
      updated_at: "2026-11-01T10:00:00.000Z",
    },
    {
      id: "33333333-3333-4333-8333-333333333333",
      name: "Assentamento de porcelanato",
      category: "Alvenaria",
      description: null,
      unit: "m2",
      base_price_cents: 9500,
      is_active: true,
      created_at: "2026-11-01T10:00:00.000Z",
      updated_at: "2026-11-01T10:00:00.000Z",
    },
    {
      id: "33333333-3333-4333-8333-333333333334",
      name: "Reparo de registro de gaveta",
      category: "Hidráulica",
      description: null,
      unit: "unit",
      base_price_cents: 15000,
      is_active: true,
      created_at: "2026-11-01T10:00:00.000Z",
      updated_at: "2026-11-01T10:00:00.000Z",
    },
    {
      id: "33333333-3333-4333-8333-333333333335",
      name: "Manutenção preventiva geral",
      category: "Manutenção Geral",
      description: null,
      unit: "hour",
      base_price_cents: 12000,
      is_active: true,
      created_at: "2026-11-01T10:00:00.000Z",
      updated_at: "2026-11-01T10:00:00.000Z",
    },
  ];

  const contracts = [
    {
      id: "66666666-6666-4666-8666-666666666661",
      client_name: "Clínica Vida",
      client_phone: "48991112233",
      scope_description: "Manutenção preventiva mensal de 6 aparelhos split",
      monthly_amount_cents: 150000,
      due_day: 10,
      started_at: "2026-01-10",
      ended_at: null,
      pdf_path: null,
      is_active: true,
      created_at: "2026-01-10T10:00:00.000Z",
      updated_at: "2026-01-10T10:00:00.000Z",
    },
  ];

  const suppliers = [
    {
      id: "88888888-8888-4888-8888-888888888881",
      name: "Refrigeração Catarinense",
      phone: "4832224455",
      notes: "Entrega no mesmo dia",
      created_at: "2026-01-10T10:00:00.000Z",
      updated_at: "2026-01-10T10:00:00.000Z",
    },
  ];

  const materials = [
    {
      id: "44444444-4444-4444-8444-444444444441",
      name: "Tubulação de cobre isolada 1/4 e 3/8",
      unit: "linear_m",
      unit_price_cents: 4500,
      price_updated_at: "2026-11-15",
      supplier_id: suppliers[0].id,
      notes: null,
      is_active: true,
      created_at: "2026-11-01T10:00:00.000Z",
      updated_at: "2026-11-15T10:00:00.000Z",
      supplier: {
        id: suppliers[0].id,
        name: suppliers[0].name,
        phone: suppliers[0].phone,
      },
    },
  ];

  const recurringExpenses = [
    {
      id: "77777777-7777-4777-8777-777777777771",
      description: "Internet fibra escritório",
      category: "Fixas",
      amount_cents: 11990,
      due_day: 25,
      is_active: true,
      created_at: "2026-01-10T10:00:00.000Z",
      updated_at: "2026-01-10T10:00:00.000Z",
    },
  ];

  let notificationPreferences = {
    id: 1,
    finance_due_enabled: true,
    contract_due_enabled: true,
    quote_unpaid_enabled: true,
    quote_stale_enabled: true,
    finance_advance_days: 3,
    contract_advance_days: 3,
    quote_completed_unpaid_days: 1,
    quote_draft_stale_days: 3,
    quote_sent_stale_days: 7,
    quote_approved_stale_days: 14,
    push_morning_enabled: true,
    push_evening_enabled: true,
    created_at: "2026-11-01T10:00:00.000Z",
    updated_at: "2026-11-01T10:00:00.000Z",
  };

  let notifications = [
    {
      id: "99999999-9999-4999-8999-999999999991",
      dedupe_key: "finance_due:55555555-5555-4555-8555-555555555551",
      category: "finance_due",
      severity: "critical",
      stage: "overdue",
      stage_rank: 3,
      title: "Compra de gás refrigerante R410A: conta atrasada",
      body: "Despesa de R$ 320,00 venceu há 2 dias.",
      action_url: `/finance?month=${billingMonth}&filter=overdue`,
      entity_type: "financial_transaction",
      entity_id: "55555555-5555-4555-8555-555555555551",
      amount_cents: 32000,
      reference_date: dueDate,
      read_at: null,
      snoozed_until: null,
      resolved_at: null,
      last_pushed_at: null,
      last_pushed_stage: null,
      last_pushed_slot_date: null,
      last_pushed_slot: null,
      created_at: "2026-11-21T08:00:00.000Z",
      updated_at: "2026-11-23T08:00:00.000Z",
    },
    {
      id: "99999999-9999-4999-8999-999999999992",
      dedupe_key: "contract_due:55555555-5555-4555-8555-555555555552",
      category: "contract_due",
      severity: "warning",
      stage: "due_today",
      stage_rank: 2,
      title: "Clínica Vida: contrato vence hoje",
      body: "Mensalidade de R$ 1.500,00 prevista para hoje.",
      action_url: `/finance?month=${billingMonth}&filter=pending`,
      entity_type: "financial_transaction",
      entity_id: "55555555-5555-4555-8555-555555555552",
      amount_cents: 150000,
      reference_date: dueDate,
      read_at: null,
      snoozed_until: null,
      resolved_at: null,
      last_pushed_at: null,
      last_pushed_stage: null,
      last_pushed_slot_date: null,
      last_pushed_slot: null,
      created_at: "2026-11-23T08:00:00.000Z",
      updated_at: "2026-11-23T08:00:00.000Z",
    },
    {
      id: "99999999-9999-4999-8999-999999999993",
      dedupe_key: `quote_unpaid:${quoteId}`,
      category: "quote_unpaid",
      severity: "warning",
      stage: "completed_unpaid",
      stage_rank: 2,
      title: "Condomínio Sol & Mar ainda não pagou (#007)",
      body: "Serviço concluído há 2 dias, R$ 1.220,00 aguardando pagamento.",
      action_url: `/quotes/${quoteId}`,
      entity_type: "quote",
      entity_id: quoteId,
      amount_cents: 122000,
      reference_date: "2026-11-21",
      read_at: null,
      snoozed_until: null,
      resolved_at: null,
      last_pushed_at: null,
      last_pushed_stage: null,
      last_pushed_slot_date: null,
      last_pushed_slot: null,
      created_at: "2026-11-22T08:00:00.000Z",
      updated_at: "2026-11-23T08:00:00.000Z",
    },
    {
      id: "99999999-9999-4999-8999-999999999994",
      dedupe_key: "quote_stale:11111111-1111-4111-8111-111111111199",
      category: "quote_stale",
      severity: "info",
      stage: "draft_stale",
      stage_rank: 1,
      title: "Rascunho de Condomínio Brisa em aberto há 5 dias (#005)",
      body: "Orçamento de R$ 480,00 sem atualização desde 18/11/2026.",
      action_url: `/quotes/${quoteId}`,
      entity_type: "quote",
      entity_id: quoteId,
      amount_cents: 48000,
      reference_date: "2026-11-18",
      read_at: "2026-11-22T12:00:00.000Z",
      snoozed_until: null,
      resolved_at: null,
      last_pushed_at: null,
      last_pushed_stage: null,
      last_pushed_slot_date: null,
      last_pushed_slot: null,
      created_at: "2026-11-21T08:00:00.000Z",
      updated_at: "2026-11-23T08:00:00.000Z",
    },
  ];

  const pushSubscriptions: Array<Record<string, unknown>> = [];

  await page.addInitScript(
    ({ key, session, skipSplash }) => {
      window.localStorage.setItem(key, JSON.stringify(session));
      if (skipSplash) {
        window.sessionStorage.setItem("fixflow_splash_seen", "1");
      }
    },
    {
      key: storageKey,
      session: fakeSession,
      skipSplash: options.skipSplash ?? true,
    },
  );

  function respondJson(route: Route, data: unknown, status = 200) {
    return route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  }

  await page.route("**/auth/v1/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/user")) {
      return respondJson(route, fakeUser);
    }
    if (url.includes("/token")) {
      return respondJson(route, fakeSession);
    }
    return respondJson(route, {});
  });

  await page.route("**/functions/v1/**", async (route) => {
    const body = route.request().postDataJSON() as { action?: string } | null;
    if (body?.action === "get-config") {
      return respondJson(route, { configured: true, vapidPublicKey: null });
    }
    if (body?.action === "send-test") {
      return respondJson(route, { sent: 1, failed: 0, deactivated: 0 });
    }
    return respondJson(route, {});
  });

  const syncQuotePaymentsToCashbook = (targetQuoteId: string) => {
    const q = quotes.find((item) => item.id === targetQuoteId);
    if (!q) {
      return;
    }

    if (q.status === "draft" || q.status === "sent" || q.status === "canceled") {
      transactions = transactions.filter(
        (tx) => !(tx.quote_id === targetQuoteId && tx.quote_payment_id !== null && tx.status === "pending"),
      );
      return;
    }

    const qPayments = quotePayments.filter((p) => p.quote_id === targetQuoteId);
    const todayIso = new Date().toISOString().slice(0, 10);

    for (const qp of qPayments) {
      if (qp.amount_cents <= 0) {
        transactions = transactions.filter(
          (tx) => !(tx.quote_payment_id === qp.id && tx.status === "pending"),
        );
        continue;
      }

      const resolvedDate =
        qp.due_date || (qp.paid_at ? qp.paid_at.slice(0, 10) : todayIso);
      const resolvedMonth = resolvedDate.slice(0, 7);
      const description = `Orçamento #${String(q.quote_number).padStart(3, "0")} · ${q.client_name} (${qp.label})`;

      const existingIdx = transactions.findIndex(
        (tx) => tx.quote_payment_id === qp.id,
      );
      if (existingIdx >= 0) {
        transactions[existingIdx] = {
          ...transactions[existingIdx],
          status: qp.status,
          description,
          amount_cents: qp.amount_cents,
          due_date: resolvedDate,
          billing_month: resolvedMonth,
          paid_at: qp.status === "paid" ? qp.paid_at ?? new Date().toISOString() : null,
        };
      } else {
        transactions.push({
          id: `55555555-5555-4555-8555-${String(Date.now() + Math.floor(Math.random() * 1000)).slice(-12)}`,
          type: "income",
          status: qp.status,
          description,
          category: "Serviços / Orçamentos",
          amount_cents: qp.amount_cents,
          due_date: resolvedDate,
          billing_month: resolvedMonth,
          paid_at: qp.status === "paid" ? qp.paid_at ?? new Date().toISOString() : null,
          notes: null,
          quote_id: q.id,
          quote_payment_id: qp.id,
          contract_id: null,
          recurring_expense_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }
  };

  const recalculateQuotePaymentsForTotal = (targetQuoteId: string) => {
    const q = quotes.find((item) => item.id === targetQuoteId);
    if (!q || q.status === "paid") {
      return;
    }

    const qPayments = quotePayments
      .filter((p) => p.quote_id === targetQuoteId)
      .sort((a, b) => a.installment_number - b.installment_number);
    const paidSum = qPayments
      .filter((p) => p.status === "paid")
      .reduce((acc, p) => acc + p.amount_cents, 0);
    const remaining = Math.max(0, q.total_cents - paidSum);
    const pendingList = qPayments.filter((p) => p.status === "pending");

    if (qPayments.length === 0) {
      if (q.total_cents > 0) {
        if (q.payment_mode === "split") {
          const dep = Math.round((q.total_cents * q.payment_deposit_percent) / 100);
          const bal = q.total_cents - dep;
          quotePayments.push(
            {
              id: `77771111-1111-4111-8111-${String(Date.now()).slice(-12)}`,
              quote_id: q.id,
              installment_number: 1,
              label: `Entrada (${q.payment_deposit_percent}%)`,
              amount_cents: dep,
              due_date: null,
              status: "pending",
              paid_at: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              id: `77771111-1111-4111-8112-${String(Date.now()).slice(-12)}`,
              quote_id: q.id,
              installment_number: 2,
              label: `Saldo (${100 - q.payment_deposit_percent}%)`,
              amount_cents: bal,
              due_date: null,
              status: "pending",
              paid_at: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          );
        } else if (q.payment_mode === "installments") {
          const count = Math.max(2, q.payment_installments_count);
          const base = Math.floor(q.total_cents / count);
          const rem = q.total_cents % count;
          for (let i = 0; i < count; i += 1) {
            quotePayments.push({
              id: `77771111-1111-4111-81${String(i + 10).padStart(2, "0")}-${String(Date.now()).slice(-12)}`,
              quote_id: q.id,
              installment_number: i + 1,
              label: `Parcela ${i + 1}/${count}`,
              amount_cents: i === 0 ? base + rem : base,
              due_date: null,
              status: "pending",
              paid_at: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        } else if (q.payment_mode === "cash") {
          quotePayments.push({
            id: `77771111-1111-4111-8111-${String(Date.now()).slice(-12)}`,
            quote_id: q.id,
            installment_number: 1,
            label: "Pagamento à vista",
            amount_cents: q.total_cents,
            due_date: null,
            status: "pending",
            paid_at: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      }
    } else if (pendingList.length > 0) {
      if (q.payment_mode === "split" && paidSum === 0 && pendingList.length === 2) {
        const dep = Math.round((q.total_cents * q.payment_deposit_percent) / 100);
        const bal = q.total_cents - dep;
        pendingList[0].amount_cents = dep;
        pendingList[1].amount_cents = bal;
      } else {
        const base = Math.floor(remaining / pendingList.length);
        const rem = remaining % pendingList.length;
        pendingList.forEach((p, idx) => {
          p.amount_cents = idx === 0 ? base + rem : base;
        });
      }
    }

    syncQuotePaymentsToCashbook(targetQuoteId);
  };

  await page.route("**/rest/v1/**", async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    const pathname = url.pathname;
    const accept = request.headers()["accept"] ?? "";
    const wantsSingle = accept.includes("application/vnd.pgrst.object+json");

    if (pathname.endsWith("/rpc/generate_monthly_recurring_transactions")) {
      return respondJson(route, 0);
    }

    if (pathname.endsWith("/rpc/sync_notifications")) {
      return respondJson(route, notifications.length);
    }

    if (pathname.endsWith("/rpc/save_quote_payment_plan")) {
      const body = request.postDataJSON() as {
        p_quote_id: string;
        p_payment_mode: string;
        p_deposit_percent?: number;
        p_installments_count?: number;
        p_payment_terms?: string;
        p_installments?: Array<{
          id?: string;
          installment_number: number;
          label: string;
          amount_cents: number;
          due_date: string | null;
        }>;
      };

      const q = quotes.find((item) => item.id === body.p_quote_id);
      if (q) {
        q.payment_mode = body.p_payment_mode;
        q.payment_deposit_percent = body.p_deposit_percent ?? 50;
        q.payment_installments_count = body.p_installments_count ?? 1;
        q.payment_terms = body.p_payment_terms ?? null;

        const paidRows = quotePayments.filter(
          (p) => p.quote_id === q.id && p.status === "paid",
        );
        const incoming = (body.p_installments ?? []).map((item, idx) => {
          const existingPending = item.id
            ? quotePayments.find((p) => p.id === item.id && p.status === "pending")
            : undefined;
          return {
            id:
              existingPending?.id ??
              `77772222-2222-4222-82${String(idx + 10).padStart(2, "0")}-${String(Date.now()).slice(-12)}`,
            quote_id: q.id,
            installment_number: paidRows.length + idx + 1,
            label: item.label,
            amount_cents: q.total_cents === 0 ? 0 : item.amount_cents,
            due_date: item.due_date ?? null,
            status: "pending" as const,
            paid_at: null,
            created_at: existingPending?.created_at ?? new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        });

        quotePayments = [
          ...quotePayments.filter((p) => p.quote_id !== q.id),
          ...paidRows,
          ...incoming,
        ];
        syncQuotePaymentsToCashbook(q.id);
        return respondJson(
          route,
          quotePayments
            .filter((p) => p.quote_id === q.id)
            .sort((a, b) => a.installment_number - b.installment_number),
        );
      }
      return respondJson(route, []);
    }

    if (pathname.endsWith("/rpc/set_quote_payment_status")) {
      const body = request.postDataJSON() as {
        p_quote_payment_id: string;
        p_status: "pending" | "paid";
      };
      const target = quotePayments.find(
        (p) => p.id === body.p_quote_payment_id,
      );
      if (!target) {
        return respondJson(route, { message: "Parcela não encontrada." }, 404);
      }

      target.status = body.p_status;
      target.paid_at = body.p_status === "paid" ? new Date().toISOString() : null;
      const q = quotes.find((item) => item.id === target.quote_id);
      if (q) {
        const allForQuote = quotePayments.filter((p) => p.quote_id === q.id);
        const allPaid =
          allForQuote.length > 0 &&
          allForQuote.every((p) => p.status === "paid");

        if (allPaid && q.total_cents > 0) {
          q.status = "paid";
          q.paid_at = new Date().toISOString();
        } else if (body.p_status === "paid" && (q.status === "draft" || q.status === "sent")) {
          q.status = "approved";
        } else if (body.p_status === "pending" && q.status === "paid") {
          q.status = q.completed_at ? "completed" : "approved";
          q.paid_at = null;
        }
        syncQuotePaymentsToCashbook(q.id);
      }

      return respondJson(route, target);
    }

    if (pathname.endsWith("/notifications")) {
      if (method === "GET") {
        return respondJson(route, notifications);
      }
      if (method === "PATCH") {
        const body = request.postDataJSON() as Partial<(typeof notifications)[number]>;
        const idFilter = url.searchParams.get("id");
        if (idFilter?.startsWith("eq.")) {
          const id = idFilter.slice(3);
          notifications = notifications.map((item) =>
            item.id === id ? { ...item, ...body } : item,
          );
          const updated = notifications.find((item) => item.id === id) ?? null;
          return respondJson(route, wantsSingle ? updated : updated ? [updated] : []);
        }
        if (idFilter?.startsWith("in.(")) {
          const ids = new Set(idFilter.slice(4, -1).split(","));
          notifications = notifications.map((item) =>
            ids.has(item.id) ? { ...item, ...body } : item,
          );
          return respondJson(route, []);
        }
      }
    }

    if (pathname.endsWith("/notification_preferences")) {
      if (method === "PATCH") {
        const body = request.postDataJSON() as Partial<typeof notificationPreferences>;
        notificationPreferences = { ...notificationPreferences, ...body };
      }
      return respondJson(
        route,
        wantsSingle ? notificationPreferences : [notificationPreferences],
      );
    }

    if (pathname.endsWith("/push_subscriptions")) {
      return respondJson(route, pushSubscriptions);
    }

    if (pathname.endsWith("/business_profile")) {
      if (method === "PATCH") {
        const body = request.postDataJSON() as Partial<typeof businessProfile>;
        businessProfile = { ...businessProfile, ...body };
        return respondJson(
          route,
          wantsSingle ? businessProfile : [businessProfile],
        );
      }
      return respondJson(
        route,
        wantsSingle ? businessProfile : [businessProfile],
      );
    }

    if (pathname.endsWith("/clients")) {
      if (method === "GET") {
        const phoneFilter = url.searchParams.get("phone_normalized");
        if (phoneFilter?.startsWith("eq.")) {
          const digits = phoneFilter.slice(3);
          const found = clients.find((c) => c.phone_normalized === digits) ?? null;
          return respondJson(route, wantsSingle ? found : found ? [found] : []);
        }
        return respondJson(route, clients);
      }

      if (method === "POST") {
        const body = request.postDataJSON() as {
          name: string;
          phone?: string | null;
          address?: string | null;
          notes?: string | null;
        };
        const created = {
          id: `aaaaaaaa-aaaa-4aaa-8aaa-${String(Date.now()).slice(-12)}`,
          name: body.name,
          phone: body.phone ?? null,
          phone_normalized: normalizePhoneDigits(body.phone),
          address: body.address ?? null,
          notes: body.notes ?? null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        clients = [...clients, created].sort((a, b) => a.name.localeCompare(b.name));
        return respondJson(route, wantsSingle ? created : [created], 201);
      }

      if (method === "PATCH") {
        const idFilter = url.searchParams.get("id");
        const id = idFilter?.startsWith("eq.") ? idFilter.slice(3) : "";
        const body = request.postDataJSON() as Partial<(typeof clients)[number]>;
        clients = clients.map((c) =>
          c.id === id
            ? {
                ...c,
                ...body,
                phone_normalized:
                  body.phone !== undefined
                    ? normalizePhoneDigits(body.phone)
                    : c.phone_normalized,
                updated_at: new Date().toISOString(),
              }
            : c,
        );
        const updated = clients.find((c) => c.id === id) ?? null;
        return respondJson(route, wantsSingle ? updated : updated ? [updated] : []);
      }

      if (method === "DELETE") {
        const idFilter = url.searchParams.get("id");
        const id = idFilter?.startsWith("eq.") ? idFilter.slice(3) : "";
        clients = clients.filter((c) => c.id !== id);
        return respondJson(route, []);
      }
    }

    if (pathname.endsWith("/quote_items")) {
      if (method === "POST") {
        const body = request.postDataJSON() as {
          quote_id: string;
          item_type: "service" | "material";
          service_id?: string | null;
          material_id?: string | null;
          description_snapshot: string;
          unit_snapshot: string;
          quantity: number;
          unit_price_snapshot_cents: number;
          sort_order?: number;
        };
        const subtotal = Math.round(
          body.quantity * body.unit_price_snapshot_cents,
        );
        const created = {
          id: `22222222-2222-4222-8222-${String(Date.now()).slice(-12)}`,
          quote_id: body.quote_id,
          item_type: body.item_type,
          service_id: body.service_id ?? null,
          material_id: body.material_id ?? null,
          description_snapshot: body.description_snapshot,
          unit_snapshot: body.unit_snapshot,
          quantity: body.quantity,
          unit_price_snapshot_cents: body.unit_price_snapshot_cents,
          subtotal_cents: subtotal,
          sort_order: body.sort_order ?? 0,
          created_at: new Date().toISOString(),
        };
        quoteItems.push(created);

        const q = quotes.find((item) => item.id === body.quote_id);
        if (q) {
          const itemsForQuote = quoteItems.filter((item) => item.quote_id === q.id);
          q.subtotal_cents = itemsForQuote.reduce(
            (sum, item) => sum + item.subtotal_cents,
            0,
          );
          q.total_cents = Math.max(
            0,
            q.subtotal_cents + q.adversity_fee_cents - q.discount_cents,
          );
          recalculateQuotePaymentsForTotal(q.id);
        }

        return respondJson(route, wantsSingle ? created : [created], 201);
      }
    }

    if (pathname.endsWith("/quotes")) {
      const idFilter = url.searchParams.get("id");
      if (method === "GET") {
        if (idFilter?.startsWith("eq.")) {
          const id = idFilter.slice(3);
          const found = quotes.find((item) => item.id === id);
          if (!found) {
            return respondJson(route, wantsSingle ? null : []);
          }
          const withItems = {
            ...found,
            items: quoteItems.filter((item) => item.quote_id === found.id),
            payments: quotePayments
              .filter((p) => p.quote_id === found.id)
              .sort((a, b) => a.installment_number - b.installment_number),
          };
          return respondJson(route, wantsSingle ? withItems : [withItems]);
        }

        const list = quotes.map((quote) => ({
          ...quote,
          quote_items: [
            {
              count: quoteItems.filter((item) => item.quote_id === quote.id)
                .length,
            },
          ],
          quote_payments: quotePayments
            .filter((p) => p.quote_id === quote.id)
            .map(({ id: pid, installment_number, label, amount_cents, due_date, status }) => ({
              id: pid,
              installment_number,
              label,
              amount_cents,
              due_date,
              status,
            })),
        }));
        return respondJson(route, list);
      }

      if (method === "POST") {
        const body = request.postDataJSON() as Record<string, unknown>;
        const created = {
          id: `11111111-1111-4111-8111-${String(Date.now()).slice(-12)}`,
          quote_number: quotes.length + 7,
          client_id: (body.client_id as string | null | undefined) ?? null,
          client_name: String(body.client_name ?? ""),
          client_phone: (body.client_phone as string | null | undefined) ?? null,
          client_address: (body.client_address as string | null | undefined) ?? null,
          title: (body.title as string | null | undefined) ?? null,
          status: "draft",
          subtotal_cents: 0,
          adversity_fee_cents: 0,
          adversity_reason: null,
          discount_cents: 0,
          total_cents: 0,
          show_item_prices:
            typeof body.show_item_prices === "boolean"
              ? body.show_item_prices
              : true,
          valid_until: (body.valid_until as string | null | undefined) ?? null,
          payment_mode: (body.payment_mode as string | undefined) ?? "cash",
          payment_deposit_percent:
            typeof body.payment_deposit_percent === "number"
              ? body.payment_deposit_percent
              : 50,
          payment_installments_count:
            typeof body.payment_installments_count === "number"
              ? body.payment_installments_count
              : 1,
          payment_terms: (body.payment_terms as string | null | undefined) ?? null,
          notes: (body.notes as string | null | undefined) ?? null,
          completed_at: null,
          paid_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        quotes.unshift(created);
        return respondJson(route, wantsSingle ? created : [created], 201);
      }

      if (method === "PATCH") {
        const id = idFilter?.startsWith("eq.") ? idFilter.slice(3) : "";
        const body = request.postDataJSON() as Partial<(typeof quotes)[number]>;
        const idx = quotes.findIndex((item) => item.id === id);
        if (idx >= 0) {
          const prevStatus = quotes[idx].status;
          const prevTotal = quotes[idx].total_cents;
          quotes[idx] = {
            ...quotes[idx],
            ...body,
            updated_at: new Date().toISOString(),
          };
          const updated = quotes[idx];
          updated.total_cents = Math.max(
            0,
            updated.subtotal_cents +
              (updated.adversity_fee_cents ?? 0) -
              (updated.discount_cents ?? 0),
          );
          if (updated.total_cents !== prevTotal && updated.status !== "paid") {
            recalculateQuotePaymentsForTotal(updated.id);
          }
          if (updated.status !== prevStatus) {
            if (updated.status === "paid") {
              updated.paid_at = updated.paid_at ?? new Date().toISOString();
              quotePayments.forEach((p) => {
                if (p.quote_id === updated.id && p.status === "pending") {
                  p.status = "paid";
                  p.paid_at = updated.paid_at;
                }
              });
            }
            if (updated.status === "approved" || updated.status === "completed") {
              if (
                quotePayments.filter((p) => p.quote_id === updated.id).length === 0 &&
                updated.total_cents > 0
              ) {
                recalculateQuotePaymentsForTotal(updated.id);
              } else {
                syncQuotePaymentsToCashbook(updated.id);
              }
            } else {
              syncQuotePaymentsToCashbook(updated.id);
            }
          }
          return respondJson(route, wantsSingle ? updated : [updated]);
        }
        return respondJson(route, wantsSingle ? null : []);
      }
    }

    if (pathname.endsWith("/financial_transactions")) {
      if (method === "GET") {
        const monthParam = url.searchParams.get("billing_month");
        const targetMonth = monthParam?.startsWith("eq.")
          ? monthParam.slice(3)
          : billingMonth;
        const rows = transactions.filter(
          (item) => item.billing_month === targetMonth,
        );
        return respondJson(route, rows);
      }

      if (method === "DELETE") {
        const idFilter = url.searchParams.get("id");
        const id = idFilter?.startsWith("eq.") ? idFilter.slice(3) : "";
        const target = transactions.find((item) => item.id === id);
        transactions = transactions.filter((item) => item.id !== id);
        return respondJson(
          route,
          wantsSingle ? (target ? { id: target.id } : null) : target ? [{ id: target.id }] : [],
        );
      }

      if (method === "PATCH") {
        const idFilter = url.searchParams.get("id");
        const id = idFilter?.startsWith("eq.") ? idFilter.slice(3) : "";
        const body = request.postDataJSON() as Partial<(typeof transactions)[number]>;
        transactions = transactions.map((item) =>
          item.id === id ? { ...item, ...body } : item,
        );
        const updated = transactions.find((item) => item.id === id) ?? null;
        return respondJson(route, wantsSingle ? updated : updated ? [updated] : []);
      }
    }

    if (pathname.endsWith("/recurring_expenses")) {
      return respondJson(route, recurringExpenses);
    }

    if (pathname.endsWith("/contracts")) {
      if (method === "POST") {
        const body = request.postDataJSON() as Record<string, unknown>;
        const created = {
          ...contracts[0],
          ...body,
          id: `66666666-6666-4666-8666-${String(Date.now()).slice(-12)}`,
        };
        contracts.push(created);
        return respondJson(route, wantsSingle ? created : [created], 201);
      }
      return respondJson(route, contracts);
    }

    if (pathname.endsWith("/services")) {
      return respondJson(route, services);
    }

    if (pathname.endsWith("/materials")) {
      return respondJson(route, materials);
    }

    if (pathname.endsWith("/suppliers")) {
      if (method === "POST") {
        const body = request.postDataJSON() as Record<string, unknown>;
        const created = {
          ...suppliers[0],
          ...body,
          id: `88888888-8888-4888-8888-${String(Date.now()).slice(-12)}`,
        };
        suppliers.push(created);
        return respondJson(route, wantsSingle ? created : [created], 201);
      }
      return respondJson(route, suppliers);
    }

    return respondJson(route, []);
  });

  return { quoteId };
}
