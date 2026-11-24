# FixFlow

Aplicação web mobile-first (PWA) de uso individual para prestadores de serviços autônomos multidisciplinares, voltada a rotinas de climatização e ar-condicionado, elétrica, alvenaria, pisos e manutenção geral.

O projeto reúne catálogo de preços, emissão de orçamentos com Pix e exportação em PDF/PNG, gestão de contratos mensais com anexo em PDF, livro-caixa integrado e alertas de vencimento, tudo projetado para operação com uma mão no smartphone (`375px` a `430px`).

## Funcionalidades

### Orçamentos (`/quotes` e `/quotes/:id`)

- Criação e edição de orçamentos com numeração sequencial e vínculo opcional a clientes cadastrados.
- Snapshot histórico de itens (`quote_items`): ao adicionar um serviço ou material, descrição, unidade e valor unitário ficam congelados no orçamento, sem sofrer efeito de reajustes futuros no catálogo.
- Edição de preço de material direto no orçamento, com opção explícita para atualizar também o catálogo.
- Suporte a taxa de adversidades, desconto, validade, observações e controle de transparência (`show_item_prices`) para exibir ou ocultar preços unitários na prévia enviada ao cliente.
- Fluxo de status (`draft`, `sent`, `approved`, `completed`, `paid`, `canceled`) com bloqueio automático de edição após pagamento.
- Planos de pagamento estruturados (à vista, entrada e saldo, parcelado em até 24 vezes ou personalizado) com sincronização automática de parcelas no Livro-Caixa via PostgreSQL.
- Prévia em folha A4 com QR Code Pix estático (padrão EMV/BACEN em `src/lib/pix.ts` com validação de CPF, CNPJ, telefone, e-mail e chave aleatória), código Copia e Cola calculado para o valor total ou próxima parcela pendente, exportação em PDF (`jsPDF`) e imagem PNG (`html-to-image`) e compartilhamento nativo (`navigator.share`) ou via WhatsApp.

### Financeiro (`/finance`)

- Livro-Caixa organizado por competência mensal (`YYYY-MM`) com resumo de saldo realizado, entradas, saídas, pendências e itens atrasados.
- Baixa de recebimentos e despesas em um toque, além de lançamentos manuais avulsos.
- Entrada automática de receitas geradas por orçamentos e parcelas aprovados ou pagos.
- Gestão de despesas fixas recorrentes (`recurring_expenses`) e geração idempotente das contas do mês via RPC `generate_monthly_recurring_transactions`.

### Contratos mensais (`/contracts`)

- Cadastro de mensalistas com escopo, valor mensal, dia de vencimento e controle de vigência (ativação e desativação sem exclusão destrutiva).
- Geração automática das mensalidades pendentes no Livro-Caixa.
- Upload e visualização de contratos em PDF no bucket privado `contract-pdfs` (limite de 10 MB, apenas `application/pdf`), com acesso por URLs assinadas temporárias (`createSignedUrl`).

### Catálogo (`/catalog`)

- **Serviços:** cadastro por categoria, unidade de medida e preço base em centavos.
- **Materiais e peças:** controle de valor unitário, fornecedor vinculado e data da última atualização de preço (`price_updated_at`).
- **Fornecedores:** agenda rápida com atalho direto para conversa no WhatsApp (`wa.me`).
- **Clientes:** cadastro com normalização de telefone brasileiro e seleção rápida ao abrir um novo orçamento.

### Perfil do emitente e central de alertas

- Dados comerciais do prestador (`business_profile`) acessíveis pelo cabeçalho, incluindo nome comercial, titular, documento, contatos, cidade/UF, especialidades, chave Pix e padrões para novos orçamentos.
- Central de notificações in-app sincronizada no banco (`sync_notifications`) para contas próximas do vencimento ou atrasadas, mensalidades de contratos, orçamentos concluídos aguardando pagamento e propostas paradas.
- Envio agendado de notificações Web Push (manhã e noite) pela Edge Function `push-notifications`, com preferências de antecedência e teste por aparelho.

### PWA e experiência em campo

- Instalável em modo `standalone` via `vite-plugin-pwa` com Service Worker customizado (`src/sw.ts`), aviso de nova versão (`PwaUpdatePrompt`) e fonte `Inter Variable` empacotada localmente para uso offline.
- Direção visual monocromática de alto contraste com pares validados em WCAG AA, alinhamento numérico `tabular-nums`, alvos de toque mínimos de `44px`, formulários em bottom sheets (`vaul`) e suporte a `safe-area-inset-bottom` e `prefers-reduced-motion`.

## Stack tecnológica

| Camada | Tecnologias |
| :--- | :--- |
| Interface e roteamento | React 19, TypeScript, Vite 8, React Router 7 |
| Estilização e UI mobile | Tailwind CSS v4, `@fontsource-variable/inter`, `vaul`, `sonner`, `lucide-react`, `motion` |
| Estado assíncrono e formulários | TanStack Query, React Hook Form, Zod, `date-fns` |
| Exportação e Pix | `jsPDF`, `html-to-image`, `qrcode.react`, gerador EMV/CRC16 próprio |
| Backend e banco de dados | Supabase (Auth, PostgreSQL, Triggers/RPCs, RLS, Storage, Edge Functions em Deno) |
| PWA | `vite-plugin-pwa`, Workbox (`injectManifest`) |
| Lint e testes | `oxlint`, `node --test`, Playwright |

## Arquitetura e organização

```text
src/
├── assets/          # Vetores originais da marca (logo-black.svg e logo-white.svg)
├── components/
│   ├── layout/      # AppShell, BottomNav (4 abas fixas) e PageHeader
│   ├── pwa/         # AppSplashIntro e PwaUpdatePrompt
│   └── ui/          # Primitivos reutilizáveis (BottomSheet, CurrencyInput, MaskedInput, BrandLogo)
├── features/        # Módulos por domínio (auth, catalog, contracts, finance, notifications, profile, quotes)
├── lib/             # Cliente Supabase, QueryClient, formatação monetária, datas, máscaras, Pix e exportação
├── pages/           # Composição das rotas (/login, /quotes, /quotes/:id, /finance, /contracts, /catalog)
├── services/        # Única camada que acessa supabase.from(), rpc(), storage e functions
├── types/           # database.types.ts gerado via Supabase CLI
└── sw.ts            # Service Worker (Workbox precache + tratamento de eventos push/click)

supabase/
├── functions/push-notifications/  # Edge Function para configuração VAPID, teste e disparo agendado
└── migrations/                    # Schema SQL versionado, triggers, RPCs, RLS e políticas do Storage

tests/unit/          # Testes unitários (máscaras, notificações, Pix, layout A4 e parcelas)
e2e/                 # Testes end-to-end mobile com Playwright e Supabase mockado
```

Decisões estruturais aplicadas em todo o projeto:

- **Isolamento de dados:** componentes e páginas nunca importam `supabase` diretamente; toda leitura e escrita passa por `src/services/*.service.ts` e hooks do TanStack Query.
- **Dinheiro em centavos inteiros:** todos os valores monetários trafegam e são persistidos como `INTEGER` (ex.: R$ 250,00 = `25000`), evitando erros de arredondamento de ponto flutuante.
- **Regras críticas no banco:** cálculo de subtotais e totais de orçamento, recálculo de parcelas pendentes, sincronização com o Livro-Caixa e geração idempotente de recorrências vivem em triggers, índices únicos parciais e RPCs do PostgreSQL.
- **Segurança single-user:** todas as tabelas e o bucket `contract-pdfs` usam Row Level Security restrito ao papel `authenticated`, sem fluxo público de criação de conta no front-end.

## Pré-requisitos

- Node.js `22.6` ou superior (usado também para executar testes unitários em TypeScript com `node --test`) e npm.
- Projeto configurado no [Supabase](https://supabase.com/) ou instância local via Supabase CLI.

## Configuração e execução local

1. Instale as dependências:

```bash
npm install
```

2. Crie o arquivo `.env.local` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-ou-publishable
# Opcional: se omitida, o app consulta a chave pública via Edge Function push-notifications
VITE_VAPID_PUBLIC_KEY=
```

Nunca coloque a chave `service_role` em variáveis `VITE_*` nem no código do cliente.

3. Aplique o schema no banco de dados Supabase a partir das migrations em `supabase/migrations/`:

```bash
npx supabase db push
```

No painel do Supabase Auth, desative o cadastro público de novos usuários e crie manualmente a conta individual do prestador.

4. Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

Em modo de desenvolvimento (`import.meta.env.DEV`), a rota `/lab` também fica disponível para pré-visualização de variantes visuais.

## Configuração opcional de Web Push

Para habilitar o disparo de alertas no celular com o app fechado:

1. Gere um par de chaves VAPID e configure os secrets da Edge Function no Supabase:
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_SUBJECT` (padrão: `mailto:contato@fixflow.app`)
   - `PUSH_CRON_SECRET`
2. Faça o deploy da função (o arquivo `supabase/config.toml` já define `verify_jwt = false`, pois a função valida o JWT do usuário nas ações autenticadas e o header `x-cron-secret` no disparo agendado):

```bash
npx supabase functions deploy push-notifications
```

3. Cadastre no Supabase Vault os segredos lidos pelos jobs `pg_cron` (agendados para 08:00 e 18:00 BRT):
   - `fixflow_project_url`: URL base do projeto Supabase
   - `fixflow_push_cron_secret`: mesmo valor definido em `PUSH_CRON_SECRET`

## Scripts disponíveis

| Comando | Descrição |
| :--- | :--- |
| `npm run dev` | Inicia o servidor de desenvolvimento do Vite |
| `npm run build` | Compila tipos (`tsc -b`) e gera o bundle de produção em `dist/` |
| `npm run preview` | Serve localmente o build gerado em `dist/` |
| `npm run lint` | Executa a verificação estática com `oxlint` |
| `npx tsc --noEmit` | Checa a tipagem TypeScript sem emitir arquivos |
| `npm run test:unit` | Executa os testes unitários em `tests/unit/` com `node --test` |
| `npm run test:e2e` | Executa a suíte E2E mobile (`390x844`) no Playwright contra `npm run preview` |
| `npm run test:all` | Roda os testes unitários seguidos pelos testes E2E |

Antes de rodar `npm run test:e2e`, gere o build com `npm run build`. A suíte E2E intercepta as chamadas ao Supabase com fixtures locais (`e2e/fixtures/mockSupabase.ts`) e não altera dados reais.

## Deploy

O build gera arquivos estáticos em `dist/` compatíveis com Cloudflare Pages e provedores equivalentes. O arquivo `public/_redirects` já mantém o fallback de SPA (`/* /index.html 200`).

No ambiente de deploy, configure:

- Comando de build: `npm run build`
- Diretório de saída: `dist`
- Variáveis de ambiente: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (e opcionalmente `VITE_VAPID_PUBLIC_KEY`)

## Documentação complementar

- [AGENTS.md](./AGENTS.md): regras de negócio, limites de escopo, padrões arquiteturais e guardrails de segurança.
- [DESIGN.md](./DESIGN.md): direção visual monocromática, tabela de contraste WCAG AA, tipografia, movimento e tom de voz.

## Licença

Software proprietário e comercial. Copyright (c) 2026 Vitor Pires. Todos os direitos reservados.

O uso, cópia, modificação, distribuição ou exploração comercial sem autorização prévia e expressa por escrito do titular é proibido. Consulte [LICENSE](./LICENSE) para os termos completos.
