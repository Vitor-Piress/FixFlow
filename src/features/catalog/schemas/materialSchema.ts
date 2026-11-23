import { z } from "zod";
import { UNIT_TYPE_VALUES } from "@/lib/units";

export const materialSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome do material (mínimo 2 caracteres)."),
  supplier_id: z.string().trim(),
  unit: z.enum(UNIT_TYPE_VALUES, {
    error: "Selecione uma unidade de medida.",
  }),
  unit_price_cents: z
    .number({ error: "Informe o preço unitário." })
    .int("O preço deve ser inteiro em centavos.")
    .min(0, "O preço não pode ser negativo."),
  notes: z.string().trim(),
});

export type MaterialFormValues = z.infer<typeof materialSchema>;
