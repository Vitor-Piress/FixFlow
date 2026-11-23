import { z } from "zod";
import { stripNonDigits } from "@/lib/utils";

export const supplierSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome do fornecedor (mínimo 2 caracteres)."),
  phone: z
    .string()
    .trim()
    .refine((value) => {
      if (value === "") {
        return true;
      }
      const digits = stripNonDigits(value);
      return digits.length >= 10 && digits.length <= 13;
    }, "Informe um telefone válido com DDD (10 ou 11 dígitos)."),
  notes: z.string().trim(),
});

export type SupplierFormValues = z.infer<typeof supplierSchema>;
