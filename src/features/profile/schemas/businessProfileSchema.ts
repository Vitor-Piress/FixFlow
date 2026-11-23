import { z } from "zod";

const optionalEmailSchema = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || z.email().safeParse(value).success,
    "Informe um e-mail válido.",
  );

export const businessProfileSchema = z.object({
  business_name: z
    .string()
    .trim()
    .min(2, "Informe o nome comercial (mínimo 2 caracteres)."),
  owner_name: z
    .string()
    .trim()
    .min(2, "Informe o nome do responsável (mínimo 2 caracteres)."),
  document: z.string().trim(),
  phone: z.string().trim(),
  email: optionalEmailSchema,
  city_state: z.string().trim(),
  specialties: z.string().trim(),
  pix_key: z.string().trim(),
  default_quote_validity_days: z
    .number({ error: "Informe a validade em dias (1 a 90)." })
    .int("Informe um número inteiro de dias.")
    .min(1, "A validade mínima é de 1 dia.")
    .max(90, "A validade máxima é de 90 dias."),
  default_payment_terms: z.string().trim(),
  default_notes: z.string().trim(),
});

export type BusinessProfileFormValues = z.infer<typeof businessProfileSchema>;
