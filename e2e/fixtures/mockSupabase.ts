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

export interface MockSupabaseOptions {
  skipSplash?: boolean;
  showItemPrices?: boolean;
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
    pix_key: "12.345.678/0001-95",
    default_quote_validity_days: 15,
    default_payment_terms: "50% na aprovação e 50% na conclusão",
    default_notes: "Garantia de 90 dias sobre os serviços executados.",
    created_at: "2026-01-01T10:00:00.000Z",
    updated_at: "2026-01-01T10:00:00.000Z",
  };

  const quoteId = "11111111-1111-4111-8111-111111111111";
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

  const quotes = [
    {
      id: quoteId,
      quote_number: 7,
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
      payment_terms: "50% na aprovação e 50% na conclusão",
      notes: "Serviço agendado para horário comercial.",
      paid_at: null,
      created_at: "2026-11-20T12:00:00.000Z",
      updated_at: "2026-11-20T12:05:00.000Z",
    },
  ];

  let transactions = [
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
      contract_id: null,
      recurring_expense_id: null,
      created_at: "2026-11-21T14:00:00.000Z",
      updated_at: "2026-11-21T14:00:00.000Z",
    },
  ];

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

    if (pathname.endsWith("/quotes")) {
      const idFilter = url.searchParams.get("id");
      if (method === "GET") {
        if (idFilter?.startsWith("eq.")) {
          const id = idFilter.slice(3);
          const found = quotes.find((item) => item.id === id);
          if (!found) {
            return respondJson(route, wantsSingle ? null : []);
          }
          const withItems = { ...found, items: quoteItems };
          return respondJson(route, wantsSingle ? withItems : [withItems]);
        }

        const list = quotes.map((quote) => ({
          ...quote,
          quote_items: [{ count: quoteItems.length }],
        }));
        return respondJson(route, list);
      }

      if (method === "POST") {
        const body = request.postDataJSON() as Record<string, unknown>;
        const created = {
          ...quotes[0],
          ...body,
          id: `11111111-1111-4111-8111-${String(Date.now()).slice(-12)}`,
          quote_number: quotes.length + 7,
        };
        quotes.unshift(created);
        return respondJson(route, wantsSingle ? created : [created], 201);
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
