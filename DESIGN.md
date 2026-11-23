# DESIGN.md — FixFlow

Direção visual e de experiência do **FixFlow** (referência de dados de design para `AGENTS.md`, `antislop` e `unslop`).

Dial: ENERGY 1 / RHYTHM 2 / MOTION 1

---

## 1. Identidade e Público

- **Produto:** FixFlow, aplicativo PWA mobile-first de uso individual para prestador de serviços autônomo multidisciplinar (climatização/ar-condicionado, elétrica, alvenaria/pisos e manutenção geral).
- **Contexto real de uso:** operado com uma mão no smartphone (`375px` a `430px`), frequentemente em obra ou sob luz solar direta, alternando rápido entre o app e o WhatsApp do cliente/fornecedor.
- **Personalidade:** instrumento técnico editorial de alto contraste — direto, confiável, legível à primeira vista e sem enfeites. Nem cara de template SaaS genérico de IA, nem interface estéril sem caráter.
- **Motivo de identidade:** monograma geométrico em bloco (`BrandLogo`, vetor original de `src/assets/logo-black.svg`), linhas divisórias estruturais de `1px`, blocos numéricos ancorados com `tabular-nums` e microcopy objetiva de campo em `pt-BR`.

---

## 2. Alavancas de Ritmo e Hierarquia

- **Um ponto focal por tela:** cada tela tem um elemento dominante claro (ex.: total/ação principal no orçamento, resumo de saldo no Livro-Caixa, busca + ação principal no Catálogo). O restante recua.
- **Contraste hierárquico real:** diferenciar dado primário (título, valor, ação principal) de metadado secundário por tamanho, peso e espaçamento intencional — não colocar tudo no mesmo card idêntico com o mesmo peso.
- **Espaço em branco como estrutura:** preferir listas limpas com divisores `1px` e espaçamento deliberado em vez de "caixas dentro de caixas" ou bordas repetidas sem função.
- **Um único acento deliberado:** preto grafite sólido (`#0A0A0A`) conduz a ação primária e o estado ativo; cor semântica entra apenas para estados financeiros/status críticos.

---

## 3. Paleta de Cores (WCAG AA Verificada)

Todos os pares de texto abaixo foram validados em `contrast-check.py` (`>= 4.5:1` para texto normal):

| Token / Uso | Cor de Texto / Elemento | Fundo | Contraste |
| :--- | :--- | :--- | :--- |
| **Texto primário (`neutral-950`)** | `#0A0A0A` | `#FFFFFF` / `#FAFAFA` | `19.80:1` / `18.97:1` |
| **Texto secundário e abas inativas (`neutral-600`)** | `#525252` | `#FFFFFF` / `#FAFAFA` | `7.81:1` / `7.49:1` |
| **Metadado discreto (`neutral-500`)** | `#737373` | `#FFFFFF` / `#FAFAFA` | `4.74:1` / `4.54:1` |
| **CTA primário (invertido)** | `#FFFFFF` | `#0A0A0A` | `19.80:1` |
| **Status Pago / Recebido (`emerald`)** | `#065F46` | `#ECFDF5` | `7.29:1` |
| **Status Pendente / Inativo (`amber`)** | `#92400E` | `#FFFBEB` | `6.84:1` |
| **Status Erro / Atrasado / Destrutivo (`red`)** | `#B91C1C` | `#FEF2F2` | `5.91:1` |
| **Status Informativo (`sky`)** | `#075985` | `#F0F9FF` | `7.09:1` |

- **Superfícies:** `#FFFFFF` (superfície principal), `#FAFAFA` (`neutral-50`, fundo externo/secundário), `#F5F5F5` (`neutral-100`, superfícies sutis de apoio).
- **Bordas estruturais (`1px`):** `#E5E5E5` (`neutral-200`, divisores) e `#D4D4D4` (`neutral-300`, campos e botões secundários).
- **Restrição de legibilidade:** `#A3A3A3` (`neutral-400`, `2.52:1` em branco) não deve ser usado em texto, rótulos de navegação ou ícones informativos.
- **Fora da identidade do produto:** degradês decorativos, glows, sombras pesadas, glassmorphism generalizado, ilustrações 3D ou cores fora da tabela acima.

---

## 4. Tipografia e Números

- **Família:** pilha nativa de sistema (`system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`) escolhida pela abertura instantânea offline em PWA mobile e alta legibilidade em telas pequenas.
- **Números:** `tabular-nums` obrigatório em valores monetários (`R$`), quantidades, datas (`dd/MM/yyyy`), números de orçamento e contadores.
- **Campos de formulário:** mínimo `16px` (`text-base`) para evitar zoom automático no iOS Safari.
- **Rótulos de seção:** evitar títulos em caixa alta com `tracking` exagerado apenas por decoração; usar peso e espaçamento para criar hierarquia limpa.

---

## 5. Layout Mobile, Interação e Movimento

- **Viewport primário:** `375px` a `430px` (zero overflow horizontal); em desktop, container centralizado `max-w-lg` (`512px`) com bordas laterais de `1px`.
- **Alvos de toque e affordance:** altura mínima de `44px` (`min-h-11` / `h-11 w-11`) em botões, abas, chips e links; `cursor-pointer` e estados claros de hover, active, disabled e foco visível via teclado (`focus-visible`).
- **Formulários e confirmações:** Bottom Sheets (`vaul`) ocupando ~85% a 95% da altura em formulários longos e altura compacta em confirmações, sempre com `env(safe-area-inset-bottom)`.
- **Movimento (`MOTION 1`):** somente transições funcionais discretas (abertura/fechamento de Bottom Sheet, feedback de toque e foco), respeitando `prefers-reduced-motion`.

---

## 6. Voz e Microcopy (`pt-BR`)

- **Tom:** prático, direto e humano — como uma ferramenta pessoal de trabalho em campo, sem linguagem promocional ou jargão robótico de IA.
- **CTAs:** verbos concretos de ação (`Salvar`, `Cadastrar serviço`, `Marcar como pago`, `Abrir no WhatsApp`, `Tentar novamente`).
- **Pontuação:** evitar travessão (`—`) decorativo em textos de interface; usar separadores simples ou frases curtas diretas.
- **Estados reais:** toda tela cobre estados de carregamento, vazio (com próximo passo claro) e erro (com ação de tentar novamente).
