import { z } from "zod";
import { isValidPhoneBR } from "@/lib/masks";

export const supplierSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome do fornecedor (mínimo 2 caracteres)."),
  phone: z
    .string()
    .trim()
    .refine(
      isValidPhoneBR,
      "Informe um telefone válido com DDD (10 ou 11 dígitos).",
    ),
  notes: z.string().trim(),
});

export type SupplierFormValues = z.infer<typeof supplierSchema>;
