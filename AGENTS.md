# AGENTS.md — FixFlow

## 1. Visão Geral do Projeto

O **FixFlow** é uma aplicação web **mobile-first (PWA)** de uso individual voltada para prestador de serviços autônomo multidisciplinar (climatização/ar-condicionado, elétrica, alvenaria/pisos e manutenção geral).
O sistema reúne:

1. Catálogo de Serviços, Fornecedores (com atalho WhatsApp) e Materiais/Peças.
2. Gerador Dinâmico de Orçamentos (com snapshot histórico de preços, taxa de adversidades, controle de exibição de valores unitários e exportação em PDF/Imagem).
3. Gestão de Contratos Mensais Recorrentes (com anexo de PDF via Supabase Storage).
4. Controle Financeiro Integrado (Livro-Caixa, contas futuras, despesas fixas recorrentes e entrada automática de orçamentos).

### Limites de Escopo (NUNCA implementar sem solicitação explícita)

- **NÃO** implementar multi-tenancy, convites de equipe ou papéis complexos (app de usuário único).
- **NÃO** criar back-end/API Node.js separada (a aplicação consome o Supabase via camada de serviços no client + Triggers/RPCs no PostgreSQL).
- **NÃO** implementar emissão de NFS-e, boletos, gateways de pagamento ou disparo automático de WhatsApp (usar apenas links `https://wa.me/...` e `navigator.share`).

---

## 2. Stack Tecnológica e Bibliotecas

- **Core:** React + TypeScript (strict) + Vite
- **PWA:** `vite-plugin-pwa` (modo `standalone`)
- **Estilização:** Tailwind CSS v4 (`@tailwindcss/vite`), `clsx`, `tailwind-merge` (helper `cn()`)
- **UI Mobile & Feedback:** `vaul` (Bottom Sheets / Drawers), `sonner` (Toasts), `lucide-react` (Ícones), `motion` (animações sutis)
- **Roteamento:** `react-router-dom`
- **Estado Assíncrono / Cache:** `@tanstack/react-query`
- **Formulários e Validação:** `react-hook-form`, `@hookform/resolvers`, `zod`
- **Datas:** `date-fns` (usar sempre para manipulação de datas, `dd/MM/yyyy` e competência `YYYY-MM`; evitar manipulação manual de `Date` com bugs de timezone)
- **BaaS / Banco / Storage:** `@supabase/supabase-js` + Supabase CLI (`npx supabase`)
- **Exportação de Orçamentos (fase dedicada):** `jsPDF` + `html-to-image` (NUNCA usar `html2canvas` por incompatibilidade com cores `oklch()` do Tailwind v4)

---

## 3. Arquitetura e Organização de Pastas

Siga princípios **SOLID**, separação clara de responsabilidades e organização por domínio (`feature-based`):

```text
src/
├── components/
│   ├── ui/               # Primitivos reutilizáveis (Button, Input, BottomSheet/Drawer, Badge)
│   └── layout/           # AppShell, BottomNav, PageHeader
├── features/             # Módulos de domínio (cada um com components/, hooks/, schemas/)
│   ├── auth/
│   ├── catalog/          # Serviços, Materiais e Fornecedores
│   ├── quotes/           # Orçamentos, itens snapshot e preview/exportação
│   ├── contracts/        # Contratos mensais e upload/visualização de PDF
│   └── finance/          # Livro-Caixa, contas a pagar/receber e recorrências
├── lib/
│   ├── supabase.ts       # Instância única do Supabase Client (tipada com Database)
│   ├── queryClient.ts    # Configuração global do TanStack Query
│   ├── money.ts          # Funções puras: formatCentsToBRL, parseCurrencyToCents
│   └── utils.ts          # cn(), formatação de telefone e link wa.me
├── services/             # ÚNICA camada autorizada a chamar supabase.from() / rpc() / storage
├── types/
│   └── database.types.ts # Gerado automaticamente via Supabase CLI (NUNCA editar manualmente)
└── pages/                # Composição leve das rotas
```

### Regras Arquiteturais Obrigatórias

- **Isolamento de Dados:** Componentes React e páginas **NUNCA** devem importar `supabase` diretamente nem executar queries. Toda comunicação passa por `src/services/*.service.ts` e é consumida via hooks do **TanStack Query** (`useQuery` / `useMutation`).
- **Invalidação de Cache:** Toda mutação que altere orçamentos, contratos ou transações deve invalidar as query keys correspondentes (incluindo o resumo do Livro-Caixa).
- **Tipagem do Banco:** Sempre consultar `src/types/database.types.ts` antes de escrever queries. Nunca inventar nomes de colunas ou usar `any`.
- **Migrations Versionadas:** Toda alteração de schema SQL, Trigger, RPC ou RLS deve ser salva em `supabase/migrations/`.

---

## 4. Regras de Negócio Críticas (Banco e Domínio)

1. **Valores Monetários em Centavos (`INTEGER`):**
   - TODO valor em dinheiro trafega e é persistido em **centavos inteiros** (ex.: R$ 250,00 = `25000`).
   - **NUNCA** usar `FLOAT`/`REAL` para valores monetários.
   - Campos de metragem/volume/quantidade (`quantity`) aceitam decimais (`NUMERIC(10,2)`, ex.: `12.50`). O banco calcula `subtotal_cents = round(quantity * unit_price_snapshot_cents)` e sincroniza `quotes.subtotal_cents` e `quotes.total_cents` automaticamente via triggers; no front-end, usar `Math.round(quantity * unitPriceCents)` para pré-visualização em tempo real.
2. **Snapshot Histórico de Orçamentos (`quote_items`):**
   - Ao adicionar serviço ou material a um orçamento, copiar e congelar `description_snapshot`, `unit_snapshot` e `unit_price_snapshot_cents`.
   - Reajustar um preço em `services` ou `materials` **NUNCA** pode alterar orçamentos existentes.
   - Ao editar o preço de um material dentro de um orçamento em aberto (`draft` ou `sent`), salvar em `quote_items`; **somente** atualizar a tabela `materials` (`unit_price_cents` + `price_updated_at = hoje`) se o usuário marcar explicitamente a opção _"Atualizar no catálogo"_.
3. **Ciclo de Status e Gatilho Financeiro (`quotes.status`):**
   - Enum oficial: `draft` (Rascunho) → `sent` (Enviado) → `approved` (Aprovado) → `completed` (Concluído / Aguardando Pagamento) → `paid` (Pago) / `canceled` (Cancelado).
   - Um serviço pode estar `completed` sem ter sido pago — **NÃO** gerar receita nesse status.
   - Somente a transição para `paid` dispara a Trigger do PostgreSQL (`create_cashbook_entry_on_quote_paid`), gerando **1 lançamento único** de `income` (`status = 'paid'`) pelo `total_cents` em `financial_transactions` (com proteção contra duplicidade via índice único parcial em `quote_id`).
4. **Transparência no Orçamento (`quotes.show_item_prices`):**
   - Se `false`, a visualização/exportação para o cliente lista serviços, materiais e quantidades, mas **oculta** preços unitários/subtotais e exibe apenas o **Valor Total Global** (`total_cents`) e `payment_terms`.
5. **Contratos Mensais, PDF e Recorrências Automáticas:**
   - PDFs de contratos são armazenados no bucket privado `contract-pdfs` (limite 10 MB, apenas `application/pdf`), salvando o caminho em `contracts.pdf_path` e acessando via `createSignedUrl`.
   - Contratos ativos (`contracts`) e despesas fixas (`recurring_expenses`) geram lançamentos `pending` do mês via RPC idempotente `generate_monthly_recurring_transactions(target_month)` controlada por `billing_month` (`YYYY-MM`) e índices únicos parciais.
6. **Segurança (RLS):**
   - Todas as tabelas (`suppliers`, `services`, `materials`, `quotes`, `quote_items`, `contracts`, `recurring_expenses`, `financial_transactions`) e o bucket `contract-pdfs` operam com RLS habilitado para `to authenticated` (cadastros públicos desabilitados no Supabase Auth).

---

## 5. Diretrizes de UI / UX (Mobile-First)

- **Viewport Primário:** Projetar sempre para uso com uma mão em smartphones (`375px` a `430px` de largura), mantendo adaptação limpa em desktop (container centralizado).
- **Alvos de Toque:** Botões e itens clicáveis devem ter altura mínima de `44px`.
- **Padrão de Formulários e Modais (`vaul`):**
  - Formulários de criação/edição e detalhes rápidos devem abrir em **Full-Height Bottom Sheets** ocupando ~85% a 95% da altura da tela, com _drag handle_ no topo, cabeçalho fixo, corpo rolável e rodapé fixo com CTA principal.
- **Direção Visual:**
  - Estética **minimalista editorial de alto contraste** (paleta monocromática neutra: preto/grafite, branco, cinzas estruturais e bordas finas `1px`, reservando cor semântica discreta apenas para status críticos como pago/pendente/atrasado).
  - **PROIBIDO:** degradês decorativos, sombras pesadas, excesso de cores ou poluição visual.
  - Tipografia legível com `tabular-nums` obrigatório em todos os valores monetários e quantidades.
- **Idioma da Interface:** 100% em **Português do Brasil (`pt-BR`)** (rótulos, placeholders, validações Zod e toasts).

### Direção Visual (`DESIGN.md`) e Skills Anti-Slop (`.agents/skills/`)

- **Fonte de Direção:** consultar [DESIGN.md](./DESIGN.md) antes de planejar ou construir telas/componentes (paleta verificada em WCAG AA, dials `ENERGY 1 / RHYTHM 2 / MOTION 1`, tipografia e tom de voz).
- **Precedência:** `AGENTS.md` e `DESIGN.md` sempre prevalecem sobre exemplos genéricos de qualquer skill (não adicionar ilustrações 3D, degradês ou cores decorativas fora da identidade editorial monocromática do FixFlow).
- **Construção de novas telas e fases (Modo `during`):** ativar `antislop` em modo `during` junto com os módulos aplicáveis em `.agents/skills/` (`antislop-ui`, `antislop-layoutmobile`, `antislop-human`, `antislop-copywriting` e `antislop-code`) e validar o **Delivery Gate** (incluindo contraste via `.agents/skills/antislop-human/contrast-check.py` quando introduzir novos pares de cor).
- **Auditoria e polimento de telas existentes (Modo `after` / `unslop`):** ao revisar ou refinar interfaces já construídas, usar `antislop` em modo `after` (relatório numerado em `anti-slop/`) e/ou `unslop` respeitando `DESIGN.md`.

### Identidade Visual e Logo

- Os arquivos originais da marca estão em `src/assets/logo.svg` (e `public/favicon.svg` para o favicon).
- Criar e reutilizar o componente `src/components/ui/BrandLogo.tsx` a partir dos vetores reais de `src/assets/logo.svg`, usando `fill="currentColor"` (ou `stroke="currentColor"`) para herdar a cor do texto do Tailwind.
- **NUNCA** substituir a logo da marca por ícones genéricos do `lucide-react` nem desenhar SVGs inventados.
- Onde usar `BrandLogo`: tela de Login, `PageHeader` (versão compacta) e rodapé discreto do documento de orçamento exportado.

---

## 6. Convenções de Código e Qualidade

- **Nomenclatura:** Código (componentes, hooks, variáveis, funções, schemas) em **inglês**; nomes de tabelas e colunas do banco seguem exatamente o schema definido nas migrations (`database.types.ts`).
- **Formulários:** Validar todos os inputs com **Zod** + `react-hook-form`. Inputs de moeda exibem máscara `R$` na UI mas submetem `INTEGER` (centavos) para a camada de serviço.
- **Componentes Enxutos:** Quebrar componentes grandes em subcomponentes coesos; não duplicar lógica de formatação ou cálculo fora de `src/lib/`.

---

## 7. Checklist Antes de Finalizar Qualquer Tarefa

1. Executar `npx tsc --noEmit` (zero erros de TypeScript).
2. Executar linter configurado no projeto (`npm run lint`) sem warnings críticos.
3. Verificar se nenhuma chamada ao Supabase vazou para fora de `src/services/`.
4. Conferir se todos os cálculos financeiros usam inteiros em centavos e formatação `tabular-nums`.
5. Validar responsividade mobile (sem overflow horizontal em `375px`).

---

## 8. Navegação, Edge Cases e Padrões Mobile-First

### Mapa de Rotas e BottomNav (4 abas fixas)

- `/` → redireciona para `/quotes`
- `/login` → apenas login (NÃO criar tela/link de cadastro)
- `/quotes` → lista de orçamentos + criação/edição (`/quotes/:id`) e preview para envio
- `/finance` → Livro-Caixa por mês (`YYYY-MM`), contas pendentes e gestão de `recurring_expenses`
- `/contracts` → contratos mensais e upload/leitura de PDF no bucket `contract-pdfs`
- `/catalog` → sub-abas: Serviços, Materiais e Fornecedores (com atalho `wa.me`)

### Regras de Comportamento e Segurança Operacional

- **Orçamentos pagos (`status === 'paid'`):** bloquear edição de itens, descontos e taxas (modo somente leitura + visualização/exportação), pois a receita já foi lançada no Livro-Caixa via Trigger.
- **Soft-delete (`is_active`):** em `services`, `materials`, `contracts` e `recurring_expenses`, preferir desativar (`is_active = false`) em vez de deletar registros; seletores de orçamento devem listar apenas itens com `is_active = true`.
- **Recorrências:** invocar a RPC `generate_monthly_recurring_transactions(billingMonth)` ao carregar o Livro-Caixa daquele mês (com deduplicação via TanStack Query) e após criar/reativar um contrato ou despesa fixa.
- **Dados do Emitente (`business_profile`):** tabela singleton (`id = 1`) no Supabase com dados comerciais do prestador (`business_name`, `owner_name`, `document`, `phone`, `email`, `city_state`, `specialties`, `pix_key`) e padrões para novos orçamentos (`default_payment_terms`, `default_quote_validity_days`, `default_notes`). Acessível via botão de perfil/configurações no `PageHeader` abrindo um Bottom Sheet (`vaul`) — manter apenas 4 abas no `BottomNav`.

### Guardrails de Segurança (Invioláveis)

- **Chaves no Client:** usar EXCLUSIVAMENTE `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (ou publishable key). **NUNCA** importar, mencionar ou solicitar `service_role` key no código front-end ou em variáveis `VITE_*`.
- **RLS e Storage:** **NUNCA** criar políticas para `anon`/`public` nem alterar o bucket `contract-pdfs` para público. Todo acesso a PDFs deve usar `createSignedUrl(path, 60)` (expiração curta).
- **Renderização Segura:** **NUNCA** usar `dangerouslySetInnerHTML` (especialmente no preview/exportação de orçamentos); renderizar todos os textos via JSX escapado normalmente.
- **Lógica Sensível no Banco:** manter totais de orçamento, gatilho `paid` → Livro-Caixa e recorrências nas Triggers/RPC do PostgreSQL; o front-end apenas exibe pré-visualizações e consome os resultados do banco.

### Cuidados Obrigatórios de Mobile / Brasil / Deploy

- **Datas sem bug de timezone:** NUNCA usar `new Date('YYYY-MM-DD')`; usar sempre `parseISO()` e `format()` do `date-fns` com locale `ptBR`.
- **Teclados nativos e iOS:** usar `inputMode="numeric"` (moeda/dia), `inputMode="decimal"` (quantidade/metragem) e `inputMode="tel"` (telefone). Manter `text-base` (`16px`) mínimo em campos de formulário para evitar zoom automático no iOS Safari.
- **Safe Area PWA:** aplicar `padding-bottom: env(safe-area-inset-bottom)` no `BottomNav` e nos rodapés fixos dos Bottom Sheets (`vaul`).
- **Cloudflare Pages SPA:** manter `public/_redirects` com `/* /index.html 200`.

### Ordem Sugerida de Implementação (por fatias verticais)

1. **Fundação:** `src/lib/` (`supabase.ts`, `queryClient.ts`, `money.ts`, `utils.ts`), `src/config/provider.ts`, `public/_redirects`, Auth + `AppShell`/`BottomNav`.
2. **Catálogo:** Fornecedores (com atalho WhatsApp), Serviços e Materiais (com `price_updated_at`).
3. **Orçamentos:** CRUD de orçamento + itens snapshot + opção _"Atualizar no catálogo"_ ao editar preço de material + fluxo de status (`draft` → `paid`).
4. **Contratos:** CRUD de mensalistas + upload/visualização de PDF via `createSignedUrl`.
5. **Financeiro:** Livro-Caixa mensal + RPC automática de recorrências + Despesas Fixas + liquidação em 1 toque.
6. **Exportação & PWA:** Preview do orçamento respeitando `show_item_prices`, exportação PDF/Imagem (`jsPDF` + `html-to-image`) e configuração final do `vite-plugin-pwa`.
