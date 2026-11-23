import { z } from "zod";
import { parseQuantityBR, UNIT_TYPE_VALUES } from "@/lib/units";

export const quoteItemSchema = z.object({
  item_type: z.enum(["service", "material"], {
    error: "Selecione o tipo do item.",
  }),
  service_id: z.string().nullable(),
  material_id: z.string().nullable(),
  description_snapshot: z
    .string()
    .trim()
    .min(2, "Informe a descrição do item (mínimo 2 caracteres)."),
  unit_snapshot: z.enum(UNIT_TYPE_VALUES, {
    error: "Selecione uma unidade de medida.",
  }),
  quantity_raw: z
    .string()
    .trim()
    .refine(
      (value) => parseQuantityBR(value) !== null,
      "Informe uma quantidade maior que zero (ex.: 1 ou 2,5).",
    ),
  unit_price_snapshot_cents: z
    .number({ error: "Informe o valor unitário." })
    .int("O valor deve ser inteiro em centavos.")
    .min(0, "O valor unitário não pode ser negativo."),
  update_catalog_price: z.boolean(),
});

export type QuoteItemFormValues = z.infer<typeof quoteItemSchema>;
