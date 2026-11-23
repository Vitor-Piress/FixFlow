import { z } from "zod";
import { stripNonDigits } from "@/lib/utils";

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const quoteHeaderSchema = z.object({
  client_name: z
    .string()
    .trim()
    .min(2, "Informe o nome do cliente (mínimo 2 caracteres)."),
  client_phone: z
    .string()
    .trim()
    .refine((value) => {
      if (value === "") {
        return true;
      }
      const digits = stripNonDigits(value);
      return digits.length >= 10 && digits.length <= 13;
    }, "Informe um telefone válido com DDD (10 ou 11 dígitos)."),
  client_address: z.string().trim(),
  title: z.string().trim(),
  valid_until: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || ISO_DATE_REGEX.test(value),
      "Informe uma data de validade válida.",
    ),
  payment_terms: z.string().trim(),
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
