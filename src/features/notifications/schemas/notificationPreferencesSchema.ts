import { z } from "zod";

function integerRangeSchema(min: number, max: number, label: string) {
  return z
    .number({ message: `Informe um número válido para ${label}.` })
    .int(`Informe um número inteiro para ${label}.`)
    .min(min, `Use no mínimo ${min} ${min === 1 ? "dia" : "dias"}.`)
    .max(max, `Use no máximo ${max} dias.`);
}

export const notificationPreferencesSchema = z.object({
  finance_due_enabled: z.boolean(),
  contract_due_enabled: z.boolean(),
  quote_unpaid_enabled: z.boolean(),
  quote_stale_enabled: z.boolean(),
  finance_advance_days: integerRangeSchema(0, 30, "antecedência financeira"),
  contract_advance_days: integerRangeSchema(0, 30, "antecedência de contratos"),
  quote_completed_unpaid_days: integerRangeSchema(
    0,
    60,
    "orçamento concluído sem pagamento",
  ),
  quote_draft_stale_days: integerRangeSchema(1, 90, "rascunho parado"),
  quote_sent_stale_days: integerRangeSchema(1, 90, "enviado sem resposta"),
  quote_approved_stale_days: integerRangeSchema(1, 180, "aprovado parado"),
  push_morning_enabled: z.boolean(),
  push_evening_enabled: z.boolean(),
});

export type NotificationPreferencesFormValues = z.infer<
  typeof notificationPreferencesSchema
>;
