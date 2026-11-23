import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, LogOut } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MaskedInput } from "@/components/ui/MaskedInput";
import { Textarea } from "@/components/ui/Textarea";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  useBusinessProfile,
  useUpdateBusinessProfile,
} from "@/features/profile/hooks/useBusinessProfile";
import {
  businessProfileSchema,
  type BusinessProfileFormValues,
} from "@/features/profile/schemas/businessProfileSchema";
import {
  DOCUMENT_INPUT_MAX_LENGTH,
  maskDocumentBR,
  maskPhoneBR,
  PHONE_INPUT_MAX_LENGTH,
} from "@/lib/masks";
import { emptyStringToNull } from "@/lib/utils";
import type { BusinessProfile } from "@/services/businessProfile.service";

interface BusinessProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_FORM_VALUES: BusinessProfileFormValues = {
  business_name: "",
  owner_name: "",
  document: "",
  phone: "",
  email: "",
  city_state: "",
  specialties: "",
  pix_key: "",
  default_quote_validity_days: 15,
  default_payment_terms: "",
  default_notes: "",
};

function mapProfileToFormValues(
  profile: BusinessProfile,
): BusinessProfileFormValues {
  return {
    business_name: profile.business_name,
    owner_name: profile.owner_name,
    document: maskDocumentBR(profile.document ?? ""),
    phone: maskPhoneBR(profile.phone ?? ""),
    email: profile.email ?? "",
    city_state: profile.city_state ?? "",
    specialties: profile.specialties ?? "",
    pix_key: profile.pix_key ?? "",
    default_quote_validity_days: profile.default_quote_validity_days,
    default_payment_terms: profile.default_payment_terms ?? "",
    default_notes: profile.default_notes ?? "",
  };
}

export function BusinessProfileSheet({
  open,
  onOpenChange,
}: BusinessProfileSheetProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const {
    data: profile,
    isLoading,
    isError,
    refetch,
  } = useBusinessProfile({ enabled: open });

  const updateProfile = useUpdateBusinessProfile();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<BusinessProfileFormValues>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  });

  useEffect(() => {
    if (open && profile) {
      reset(mapProfileToFormValues(profile));
    }
  }, [open, profile, reset]);

  async function onSubmit(values: BusinessProfileFormValues) {
    try {
      await updateProfile.mutateAsync({
        business_name: values.business_name.trim(),
        owner_name: values.owner_name.trim(),
        document: emptyStringToNull(values.document),
        phone: emptyStringToNull(values.phone),
        email: emptyStringToNull(values.email),
        city_state: emptyStringToNull(values.city_state),
        specialties: emptyStringToNull(values.specialties),
        pix_key: emptyStringToNull(values.pix_key),
        default_quote_validity_days: values.default_quote_validity_days,
        default_payment_terms: emptyStringToNull(values.default_payment_terms),
        default_notes: emptyStringToNull(values.default_notes),
      });

      onOpenChange(false);
    } catch {
      // Mutation onError already notifies the user via toast.
    }
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut();
      onOpenChange(false);
      toast.success("Você saiu da conta");
      navigate("/login", { replace: true });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível encerrar a sessão.";
      toast.error(message);
    } finally {
      setIsSigningOut(false);
    }
  }

  const isBusy = updateProfile.isPending || isSigningOut;

  return (
    <BottomSheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isBusy) {
          onOpenChange(nextOpen);
        }
      }}
      title="Perfil do emitente"
      description="Dados comerciais e padrões de novos orçamentos"
      fullHeight
      footer={
        <Button
          type="submit"
          form="business-profile-form"
          size="lg"
          className="w-full"
          isLoading={updateProfile.isPending}
          disabled={isLoading || isError || !isDirty || isSigningOut}
        >
          Salvar alterações
        </Button>
      }
    >
      {isLoading ? (
        <div
          role="status"
          aria-busy="true"
          className="flex flex-col gap-3"
        >
          <span className="sr-only">Carregando dados do emitente</span>
          <div className="h-11 animate-pulse motion-reduce:animate-none rounded-lg bg-neutral-100" />
          <div className="h-11 animate-pulse motion-reduce:animate-none rounded-lg bg-neutral-100" />
          <div className="h-11 animate-pulse motion-reduce:animate-none rounded-lg bg-neutral-100" />
          <div className="h-24 animate-pulse motion-reduce:animate-none rounded-lg bg-neutral-100" />
        </div>
      ) : isError ? (
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span>Não foi possível carregar os dados do emitente.</span>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              void refetch();
            }}
          >
            Tentar novamente
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-6 pb-6">
          <form
            id="business-profile-form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="flex flex-col gap-6"
          >
            <section className="flex flex-col gap-4">
              <h3 className="border-b border-neutral-200 pb-2 text-sm font-semibold text-neutral-950">
                Dados comerciais
              </h3>

              <Input
                label="Nome comercial"
                placeholder="Ex.: FixFlow Manutenção"
                error={errors.business_name?.message}
                {...register("business_name")}
              />

              <Input
                label="Nome do responsável"
                placeholder="Seu nome completo"
                error={errors.owner_name?.message}
                {...register("owner_name")}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Controller
                  control={control}
                  name="document"
                  render={({ field }) => (
                    <MaskedInput
                      ref={field.ref}
                      name={field.name}
                      label="CPF ou CNPJ"
                      inputMode="numeric"
                      maxLength={DOCUMENT_INPUT_MAX_LENGTH}
                      placeholder="000.000.000-00"
                      value={field.value}
                      onValueChange={field.onChange}
                      onBlur={field.onBlur}
                      mask={maskDocumentBR}
                      error={errors.document?.message}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="phone"
                  render={({ field }) => (
                    <MaskedInput
                      ref={field.ref}
                      name={field.name}
                      label="Telefone / WhatsApp"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      maxLength={PHONE_INPUT_MAX_LENGTH}
                      placeholder="(48) 99999-9999"
                      value={field.value}
                      onValueChange={field.onChange}
                      onBlur={field.onBlur}
                      mask={maskPhoneBR}
                      error={errors.phone?.message}
                    />
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="E-mail comercial"
                  type="email"
                  inputMode="email"
                  autoCapitalize="none"
                  placeholder="contato@empresa.com"
                  error={errors.email?.message}
                  {...register("email")}
                />

                <Input
                  label="Cidade / UF"
                  placeholder="São José - SC"
                  error={errors.city_state?.message}
                  {...register("city_state")}
                />
              </div>

              <Input
                label="Especialidades"
                placeholder="Climatização, elétrica, alvenaria e manutenção geral"
                error={errors.specialties?.message}
                {...register("specialties")}
              />

              <Input
                label="Chave Pix"
                placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
                error={errors.pix_key?.message}
                {...register("pix_key")}
              />
            </section>

            <section className="flex flex-col gap-4">
              <h3 className="border-b border-neutral-200 pb-2 text-sm font-semibold text-neutral-950">
                Padrões de orçamento
              </h3>

              <Input
                label="Validade padrão (dias)"
                type="number"
                inputMode="numeric"
                min={1}
                max={90}
                className="tabular-nums"
                hint="Aplicada automaticamente em novos orçamentos (1 a 90 dias)."
                error={errors.default_quote_validity_days?.message}
                {...register("default_quote_validity_days", {
                  valueAsNumber: true,
                })}
              />

              <Input
                label="Condições de pagamento padrão"
                placeholder="Ex.: 50% na aprovação e 50% na conclusão"
                error={errors.default_payment_terms?.message}
                {...register("default_payment_terms")}
              />

              <Textarea
                label="Observações padrão"
                placeholder="Garantia, prazo de execução ou avisos gerais"
                rows={3}
                error={errors.default_notes?.message}
                {...register("default_notes")}
              />
            </section>
          </form>

          <section className="flex flex-col gap-3 border-t border-neutral-200 pt-5">
            <div className="flex flex-col gap-0.5">
              <h3 className="text-sm font-semibold text-neutral-950">
                Conta conectada
              </h3>
              <span className="truncate text-sm text-neutral-600">
                {user?.email ?? "Sessão ativa"}
              </span>
            </div>

            <Button
              variant="danger"
              onClick={() => {
                void handleSignOut();
              }}
              isLoading={isSigningOut}
              className="w-full"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              Sair da conta
            </Button>
          </section>
        </div>
      )}
    </BottomSheet>
  );
}
