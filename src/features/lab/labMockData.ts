import type { BadgeVariant } from "@/components/ui/Badge";
import type { CashbookTransactionLike } from "@/lib/finance";

export type LabQuoteStatus = "draft" | "sent" | "approved" | "completed" | "paid";

export interface LabQuoteItem {
  id: string;
  number: string;
  clientName: string;
  title: string;
  status: LabQuoteStatus;
  statusLabel: string;
  badgeVariant: BadgeVariant;
  itemsCount: number;
  dateLabel: string;
  validUntilLabel?: string;
  totalCents: number;
}

export interface LabTransactionItem extends CashbookTransactionLike {
  id: string;
  description: string;
  category: string;
  dueLabel: string;
  sourceKind: "contract" | "recurring" | "manual" | "quote";
}

export const LAB_TODAY_ISO = "2026-11-23";

export const LAB_QUOTES: readonly LabQuoteItem[] = [
  {
    id: "lab-q1",
    number: "#014",
    clientName: "Condomínio Sol & Mar",
    title: "Instalação de split inverter 18.000 BTUs",
    status: "completed",
    statusLabel: "Concluído",
    badgeVariant: "warning",
    itemsCount: 4,
    dateLabel: "20/11/2026",
    totalCents: 184000,
  },
  {
    id: "lab-q2",
    number: "#013",
    clientName: "Clínica Vida",
    title: "Troca de disjuntor e revisão de quadro bifásico",
    status: "sent",
    statusLabel: "Enviado",
    badgeVariant: "info",
    itemsCount: 3,
    dateLabel: "19/11/2026",
    validUntilLabel: "04/12/2026",
    totalCents: 92000,
  },
  {
    id: "lab-q3",
    number: "#012",
    clientName: "Padaria Central",
    title: "Higienização completa de 3 evaporadoras",
    status: "approved",
    statusLabel: "Aprovado",
    badgeVariant: "info",
    itemsCount: 2,
    dateLabel: "16/11/2026",
    totalCents: 69000,
  },
  {
    id: "lab-q4",
    number: "#011",
    clientName: "Residencial Brisa",
    title: "Assentamento de porcelanato área externa",
    status: "draft",
    statusLabel: "Rascunho",
    badgeVariant: "neutral",
    itemsCount: 5,
    dateLabel: "14/11/2026",
    totalCents: 245000,
  },
  {
    id: "lab-q5",
    number: "#010",
    clientName: "Auto Elétrica Sul",
    title: "Manutenção corretiva e carga de gás R410A",
    status: "paid",
    statusLabel: "Pago",
    badgeVariant: "success",
    itemsCount: 2,
    dateLabel: "10/11/2026",
    totalCents: 54000,
  },
];

export const LAB_TRANSACTIONS: readonly LabTransactionItem[] = [
  {
    id: "lab-t1",
    type: "expense",
    status: "pending",
    description: "Cilindro gás refrigerante R410A",
    category: "Materiais e Peças",
    amount_cents: 42000,
    due_date: "2026-11-20",
    dueLabel: "Venceu 20/11/2026",
    quote_id: null,
    contract_id: null,
    recurring_expense_id: null,
    sourceKind: "manual",
  },
  {
    id: "lab-t2",
    type: "income",
    status: "pending",
    description: "Contrato Mensal, Clínica Vida",
    category: "Contratos Mensais",
    amount_cents: 150000,
    due_date: "2026-11-25",
    dueLabel: "Vence 25/11/2026",
    quote_id: null,
    contract_id: "c1",
    recurring_expense_id: null,
    sourceKind: "contract",
  },
  {
    id: "lab-t3",
    type: "expense",
    status: "pending",
    description: "Internet fibra escritório",
    category: "Despesa Fixa",
    amount_cents: 11990,
    due_date: "2026-11-28",
    dueLabel: "Vence 28/11/2026",
    quote_id: null,
    contract_id: null,
    recurring_expense_id: "r1",
    sourceKind: "recurring",
  },
  {
    id: "lab-t4",
    type: "income",
    status: "paid",
    description: "Orçamento #010, Auto Elétrica Sul",
    category: "Serviços / Orçamentos",
    amount_cents: 54000,
    due_date: "2026-11-10",
    dueLabel: "Recebido em 10/11/2026",
    quote_id: "q10",
    contract_id: null,
    recurring_expense_id: null,
    sourceKind: "quote",
  },
  {
    id: "lab-t5",
    type: "income",
    status: "paid",
    description: "Contrato Mensal, Mercado Bom Preço",
    category: "Contratos Mensais",
    amount_cents: 185000,
    due_date: "2026-11-05",
    dueLabel: "Recebido em 05/11/2026",
    quote_id: null,
    contract_id: "c2",
    recurring_expense_id: null,
    sourceKind: "contract",
  },
];
