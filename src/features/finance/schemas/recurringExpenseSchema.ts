import { z } from "zod";

export const recurringExpenseSchema = z.object({
  description: z
    .string()
    .trim()
    .min(2, "Informe a descrição (mínimo 2 caracteres)."),
  category: z
    .string()
    .trim()
    .min(2, "Informe a categoria (mínimo 2 caracteres)."),
  amount_cents: z
    .number({ error: "Informe o valor mensal." })
    .int("O valor deve ser inteiro em centavos.")
    .min(1, "Informe um valor mensal maior que R$ 0,00."),
  due_day: z
    .number({ error: "Informe o dia de vencimento (1 a 31)." })
    .int("Informe um número inteiro entre 1 e 31.")
    .min(1, "Informe um dia entre 1 e 31.")
    .max(31, "Informe um dia entre 1 e 31."),
});

export type RecurringExpenseFormValues = z.infer<typeof recurringExpenseSchema>;
