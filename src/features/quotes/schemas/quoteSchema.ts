import { isValid, parseISO } from "date-fns";
import { z } from "zod";
import { isValidPhoneBR } from "@/lib/masks";

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isOptionalValidIsoDate(value: string): boolean {
  if (value === "") {
    return true;
  }
  return ISO_DATE_REGEX.test(value) && isValid(parseISO(value));
}

export const quoteHeaderSchema = z.object({
  client_id: z.string().nullable(),
  client_name: z
    .string()
    .trim()
    .min(2, "Informe o nome do cliente (mínimo 2 caracteres)."),
  client_phone: z
    .string()
    .trim()
    .refine(
      isValidPhoneBR,
      "Informe um telefone válido com DDD (10 ou 11 dígitos).",
    ),
  client_address: z.string().trim(),
  title: z.string().trim(),
  valid_until: z
    .string()
    .trim()
    .refine(isOptionalValidIsoDate, "Informe uma data de validade válida."),
  notes: z.string().trim(),
  show_item_prices: z.boolean(),
});

export type QuoteHeaderFormValues = z.infer<typeof quoteHeaderSchema>;

export const quoteAdjustmentsSchema = z
  .object({
    adversity_fee_cents: z
      .number({ error: "Informe o valor da taxa de adversidades." })
      .int("O valor deve ser inteiro em centavos.")
      .min(0, "A taxa não pode ser negativa."),
    adversity_reason: z.string().trim(),
    discount_cents: z
      .number({ error: "Informe o valor do desconto." })
      .int("O valor deve ser inteiro em centavos.")
      .min(0, "O desconto não pode ser negativo."),
    show_item_prices: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (
      data.adversity_fee_cents > 0 &&
      data.adversity_reason.trim().length === 0
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["adversity_reason"],
        message: "Descreva o motivo da taxa de adversidades.",
      });
    }
  });

export type QuoteAdjustmentsFormValues = z.infer<typeof quoteAdjustmentsSchema>;

export const quotePaymentRowSchema = z.object({
  id: z.string().optional(),
  installment_number: z.number().int().min(1),
  label: z
    .string()
    .trim()
    .min(1, "Informe a descrição da parcela."),
  amount_cents: z
    .number({ error: "Informe o valor da parcela." })
    .int("O valor deve ser inteiro em centavos.")
    .min(0, "O valor não pode ser negativo."),
  due_date: z
    .string()
    .trim()
    .refine(isOptionalValidIsoDate, "Informe uma data válida."),
  status: z.enum(["pending", "paid"]),
});

export const quotePaymentPlanFormSchema = z.object({
  payment_mode: z.enum(["cash", "split", "installments", "custom"]),
  payment_deposit_percent: z
    .number({ error: "Informe o percentual da entrada." })
    .int("Informe um número inteiro.")
    .min(1, "O percentual mínimo é 1%.")
    .max(99, "O percentual máximo é 99%."),
  payment_installments_count: z
    .number({ error: "Informe a quantidade de parcelas." })
    .int("Informe um número inteiro.")
    .min(1, "Mínimo de 1 parcela.")
    .max(24, "Máximo de 24 parcelas."),
  payment_terms: z.string().trim(),
  installments: z.array(quotePaymentRowSchema),
});

export type QuotePaymentRowFormValue = z.infer<typeof quotePaymentRowSchema>;
export type QuotePaymentPlanFormValues = z.infer<
  typeof quotePaymentPlanFormSchema
>;
