import { isValid, parseISO } from "date-fns";
import { z } from "zod";

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(value: string): boolean {
  return ISO_DATE_REGEX.test(value) && isValid(parseISO(value));
}

export const transactionSchema = z.object({
  type: z.enum(["income", "expense"], {
    error: "Selecione o tipo de lançamento.",
  }),
  description: z
    .string()
    .trim()
    .min(2, "Informe a descrição (mínimo 2 caracteres)."),
  category: z.string().trim(),
  amount_cents: z
    .number({ error: "Informe o valor do lançamento." })
    .int("O valor deve ser inteiro em centavos.")
    .min(1, "Informe um valor maior que R$ 0,00."),
  due_date: z
    .string()
    .trim()
    .refine(isValidIsoDate, "Informe uma data de vencimento válida."),
  status: z.enum(["pending", "paid"], {
    error: "Selecione a situação do lançamento.",
  }),
  notes: z.string().trim(),
});

export type TransactionFormValues = z.infer<typeof transactionSchema>;
