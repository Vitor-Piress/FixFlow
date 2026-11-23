import { isValid, parseISO } from "date-fns";
import { z } from "zod";
import { stripNonDigits } from "@/lib/utils";

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(value: string): boolean {
  return ISO_DATE_REGEX.test(value) && isValid(parseISO(value));
}

export const contractSchema = z
  .object({
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
    scope_description: z.string().trim(),
    monthly_amount_cents: z
      .number({ error: "Informe o valor mensal." })
      .int("O valor deve ser inteiro em centavos.")
      .min(1, "Informe um valor mensal maior que R$ 0,00."),
    due_day: z
      .number({ error: "Informe o dia de vencimento (1 a 31)." })
      .int("Informe um número inteiro entre 1 e 31.")
      .min(1, "Informe um dia entre 1 e 31.")
      .max(31, "Informe um dia entre 1 e 31."),
    started_at: z
      .string()
      .trim()
      .refine(isValidIsoDate, "Informe uma data de início válida."),
    ended_at: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || isValidIsoDate(value),
        "Informe uma data de término válida.",
      ),
  })
  .superRefine((data, ctx) => {
    if (
      data.ended_at !== "" &&
      isValidIsoDate(data.started_at) &&
      isValidIsoDate(data.ended_at) &&
      data.ended_at < data.started_at
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["ended_at"],
        message: "A data de término não pode ser anterior ao início.",
      });
    }
  });

export type ContractFormValues = z.infer<typeof contractSchema>;
