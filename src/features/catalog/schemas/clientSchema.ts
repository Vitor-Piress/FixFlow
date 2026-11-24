import { z } from "zod";
import { isValidPhoneBR } from "@/lib/masks";

export const clientSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome do cliente (mínimo 2 caracteres)."),
  phone: z
    .string()
    .trim()
    .refine(
      isValidPhoneBR,
      "Informe um telefone válido com DDD (10 ou 11 dígitos).",
    ),
  address: z.string().trim(),
  notes: z.string().trim(),
});

export type ClientFormValues = z.infer<typeof clientSchema>;
