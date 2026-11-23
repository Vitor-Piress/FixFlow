import { z } from "zod";
import { UNIT_TYPE_VALUES } from "@/lib/units";

export const serviceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome do serviço (mínimo 2 caracteres)."),
  category: z
    .string()
    .trim()
    .min(2, "Informe a categoria do serviço (mínimo 2 caracteres)."),
  unit: z.enum(UNIT_TYPE_VALUES, {
    error: "Selecione uma unidade de cobrança.",
  }),
  base_price_cents: z
    .number({ error: "Informe o valor base." })
    .int("O valor deve ser inteiro em centavos.")
    .min(0, "O valor não pode ser negativo."),
  description: z.string().trim(),
});

export type ServiceFormValues = z.infer<typeof serviceSchema>;
