# DESIGN.md - FixFlow

Direção visual e de experiência do **FixFlow** (referência de dados de design para `AGENTS.md`, `antislop` e `unslop`).

Dial: ENERGY 1 / RHYTHM 2 / MOTION 2

---

## 1. Identidade e Público

- **Produto:** FixFlow, aplicativo PWA mobile-first de uso individual para prestador de serviços autônomo multidisciplinar (climatização/ar-condicionado, elétrica, alvenaria/pisos e manutenção geral).
- **Contexto real de uso:** operado com uma mão no smartphone (`375px` a `430px`), frequentemente em obra ou sob luz solar direta, alternando rápido entre o app e o WhatsApp do cliente/fornecedor.
- **Personalidade:** instrumento técnico editorial de alto contraste, direto, confiável, legível à primeira vista e sem enfeites. Nem template SaaS genérico, nem interface estéril sem separação entre áreas.
- **Motivo de identidade:** monograma geométrico em bloco (`BrandLogo`), arquitetura monocromática em 3 camadas de superfície, blocos numéricos ancorados com `tabular-nums` e microcopy objetiva de campo em `pt-BR`.

---

## 2. Alavancas de Ritmo e Hierarquia (Refino Monocromático)

- **3 camadas reais de superfície:**
  1. **Canvas base:** zinco suave `#F4F4F5` (`bg-zinc-100`) para dar respiro e separar áreas sem recorrer a cor decorativa.
  2. **Superfície de conteúdo:** cards brancos separados `#FFFFFF` (`rounded-xl border border-zinc-200`) e barras fixas brancas (`PageHeader`, `BottomNav`).
  3. **Bloco focal escuro:** cartões `#0A0A0A` (`bg-neutral-950 text-white`) nos resumos principais de Financeiro, Contratos, Despesas Fixas e Detalhe do Orçamento.
- **Um ponto focal por tela:** cada tela destaca seu indicador ou resumo dominante no bloco focal escuro ou no cabeçalho; listas em cards brancos recuam para leitura rápida sob toque.
- **Um único acento deliberado:** preto grafite sólido (`#0A0A0A` / `#09090B`) conduz a ação primária e o estado ativo; cor semântica entra apenas para estados financeiros, atrasos e progresso de recebimento.
- **Exceção documental (`QuoteDocumentPreview`):** a folha de prévia e exportação A4 em PDF/PNG permanece em fundo branco sólido (`bg-white`) para impressão e compartilhamento limpo no WhatsApp.

---

## 3. Paleta de Cores (WCAG AA Verificada)

Todos os pares de texto abaixo foram validados em `contrast-check.py` (`>= 4.5:1` para texto normal):

| Token / Uso | Cor de Texto / Elemento | Fundo | Contraste |
| :--- | :--- | :--- | :--- |
| **Texto primário (`zinc-950`)** | `#09090B` | `#FFFFFF` / `#F4F4F5` | `19.90:1` / `18.10:1` |
| **Texto secundário (`zinc-600`)** | `#52525B` | `#FFFFFF` / `#F4F4F5` | `7.73:1` / `7.03:1` |
| **Metadado discreto em card branco (`zinc-500`)** | `#71717A` | `#FFFFFF` | `4.83:1` |
| **Botão secundário preenchido (`zinc-100` / `zinc-200`)** | `#09090B` | `#F4F4F5` / `#E4E4E7` | `18.10:1` / `15.68:1` |
| **Aba inativa em trilha (`SegmentedControl`)** | `#52525B` | `#E4E4E7` | `6.09:1` |
| **CTA primário e resumo escuro: texto principal** | `#FFFFFF` | `#0A0A0A` | `19.80:1` |
| **Resumo escuro: rótulo e previsto (`zinc-300`)** | `#D4D4D8` | `#0A0A0A` | `13.40:1` |
| **Resumo escuro: entradas e barra (`emerald-300`)** | `#6EE7B7` | `#0A0A0A` | `12.99:1` |
| **Resumo escuro: saldo negativo (`red-300`)** | `#FCA5A5` | `#0A0A0A` | `10.43:1` |
| **Resumo escuro: badge de atraso (`red-100` / `red-800`)** | `#FEE2E2` | `#991B1B` | `6.80:1` |
| **Status Pago / Recebido (`emerald`)** | `#065F46` | `#ECFDF5` | `7.29:1` |
| **Status Pendente / Inativo (`amber`)** | `#92400E` | `#FFFBEB` | `6.84:1` |
| **Status Erro / Atrasado / Destrutivo (`red`)** | `#B91C1C` | `#FEF2F2` | `5.91:1` |
| **Status Informativo (`sky`)** | `#075985` | `#F0F9FF` | `7.09:1` |

- **Superfícies:** `#F4F4F5` (`zinc-100`, canvas base da coluna mobile), `#E4E4E7` (`zinc-200`, fundo externo em telas `>= 640px` e trilhas de seleção), `#FFFFFF` (cards, cabeçalho e navegação inferior), `#0A0A0A` (resumos escuros e CTAs primários).
- **Bordas estruturais (`1px`):** `#E4E4E7` (`zinc-200`, contornos de cards e divisores suaves) e `#71717A` (`zinc-500`, contornos de campos de entrada e botões secundários em conformidade com WCAG 1.4.11 >= 3:1).
- **Regra de guarda:** `#71717A` (`zinc-500`) não deve ser usado para texto direto sobre o canvas `#F4F4F5` (`4.40:1`, abaixo de `4.5:1`); sobre o canvas e superfícies sutis usar sempre `#52525B` (`zinc-600`, `>= 6.09:1`). `#A1A1AA` (`zinc-400`) não deve ser usado em texto, rótulos ou ícones informativos.
- **Fora da identidade do produto:** degradês decorativos, glows, sombras pesadas, glassmorphism generalizado, ilustrações 3D ou cores fora da tabela acima.

---

## 4. Tipografia e Números

- **Família própria offline:** `Inter Variable` (`@fontsource-variable/inter`), empacotada localmente em `.woff2` e incluída no precache do Service Worker, com fallback para a pilha nativa de sistema (`system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`). Garante renderização idêntica entre Android, iOS, Desktop, funcionamento offline em campo e exportação de orçamento via `html-to-image` sem dependência de rede externa.
- **Números:** `tabular-nums` obrigatório em valores monetários (`R$`), quantidades, datas (`dd/MM/yyyy`), números de orçamento e contadores.
- **Campos de formulário:** mínimo `16px` (`text-base`) para evitar zoom automático no iOS Safari.
- **Rótulos de seção:** evitar títulos em caixa alta com `tracking` exagerado apenas por decoração; usar peso e espaçamento para criar hierarquia limpa.

---

## 5. Layout Mobile, Interação e Movimento

- **Viewport primário:** `375px` a `430px` (zero overflow horizontal); em desktop, container centralizado `max-w-lg` (`512px`) em `#F4F4F5` com bordas laterais `#E4E4E7` sobre fundo externo `#E4E4E7`.
- **Alvos de toque e affordance:** altura mínima de `44px` (`min-h-11` / `h-11 w-11`) em botões, abas, chips e links; `cursor-pointer` e estados claros de hover, active, disabled e foco visível via teclado (`focus-visible`).
- **Navegação inferior (`BottomNav`):** barra branca fixa (`#FFFFFF`, borda superior `#E4E4E7`, `env(safe-area-inset-bottom)`) com as 4 abas fixas. A aba ativa vira pílula grafite (`#0A0A0A`) com ícone e rótulo em branco (`19.80:1`) e desliza entre as abas; as inativas mostram só o ícone em `#52525B` (`7.73:1`) e mantêm o nome acessível via `aria-label`. O conteúdo reserva `4.75rem` de respiro inferior.
- **Formulários e confirmações:** Bottom Sheets (`vaul`) ocupando ~85% a 95% da altura em formulários longos e altura compacta em confirmações, sempre com `env(safe-area-inset-bottom)`.
- **Movimento (`MOTION 2`):** transições físicas funcionais com `motion/react` (curva editorial `[0.22, 1, 0.36, 1]` e springs amortecidos sem bounce exagerado), indicador compartilhado `layoutId` no `BottomNav` e `SegmentedControl`, deslocamento direcional na troca de mês em `/finance`, entrada vertical curta em rotas e animação autoral de abertura única por sessão (`AppSplashIntro`, pulável ao toque), sempre sob `<MotionConfig reducedMotion="user">` respeitando `prefers-reduced-motion`.

---

## 6. Voz e Microcopy (`pt-BR`)

- **Tom:** prático, direto e humano, como uma ferramenta pessoal de trabalho em campo, sem linguagem promocional ou jargão robótico de IA.
- **CTAs:** verbos concretos de ação (`Salvar`, `Cadastrar serviço`, `Marcar como pago`, `Abrir no WhatsApp`, `Tentar novamente`).
- **Pontuação:** não usar travessão (`—`) em textos de interface; usar ponto médio (`·`), vírgula ou frases curtas diretas.
- **Estados reais:** toda tela cobre estados de carregamento, vazio (com próximo passo claro) e erro (com ação de tentar novamente).
