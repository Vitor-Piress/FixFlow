import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  BellRing,
  Send,
  Smartphone,
} from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CheckboxRow } from "@/components/ui/CheckboxRow";
import { Input } from "@/components/ui/Input";
import type { PushDeviceStatus } from "@/features/notifications/hooks/usePushSubscription";
import {
  notificationPreferencesSchema,
  type NotificationPreferencesFormValues,
} from "@/features/notifications/schemas/notificationPreferencesSchema";
import { formatDateBR } from "@/lib/dates";
import type { PushEnvironment } from "@/lib/notifications";
import type {
  NotificationPreferences,
  PushSubscriptionRecord,
} from "@/services/notifications.service";

interface NotificationPreferencesTabProps {
  open: boolean;
  formId: string;
  preferences: NotificationPreferences | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  pushEnv: PushEnvironment;
  pushStatus: PushDeviceStatus;
  currentEndpoint: string | null;
  isPushMutating: boolean;
  isTestingPush: boolean;
  onSubscribePush: () => void;
  onUnsubscribePush: () => void;
  onTestPush: () => void;
  subscriptions: PushSubscriptionRecord[];
  onDirtyChange: (dirty: boolean) => void;
  onSubmitPreferences: (values: NotificationPreferencesFormValues) => Promise<void>;
}

const DEFAULT_VALUES: NotificationPreferencesFormValues = {
  finance_due_enabled: true,
  contract_due_enabled: true,
  quote_unpaid_enabled: true,
  quote_stale_enabled: true,
  finance_advance_days: 3,
  contract_advance_days: 3,
  quote_completed_unpaid_days: 1,
  quote_draft_stale_days: 3,
  quote_sent_stale_days: 7,
  quote_approved_stale_days: 14,
  push_morning_enabled: true,
  push_evening_enabled: true,
};

function mapPreferencesToFormValues(
  prefs: NotificationPreferences,
): NotificationPreferencesFormValues {
  return {
    finance_due_enabled: prefs.finance_due_enabled,
    contract_due_enabled: prefs.contract_due_enabled,
    quote_unpaid_enabled: prefs.quote_unpaid_enabled,
    quote_stale_enabled: prefs.quote_stale_enabled,
    finance_advance_days: prefs.finance_advance_days,
    contract_advance_days: prefs.contract_advance_days,
    quote_completed_unpaid_days: prefs.quote_completed_unpaid_days,
    quote_draft_stale_days: prefs.quote_draft_stale_days,
    quote_sent_stale_days: prefs.quote_sent_stale_days,
    quote_approved_stale_days: prefs.quote_approved_stale_days,
    push_morning_enabled: prefs.push_morning_enabled,
    push_evening_enabled: prefs.push_evening_enabled,
  };
}

export function NotificationPreferencesTab({
  open,
  formId,
  preferences,
  isLoading,
  isError,
  onRetry,
  pushEnv,
  pushStatus,
  currentEndpoint,
  isPushMutating,
  isTestingPush,
  onSubscribePush,
  onUnsubscribePush,
  onTestPush,
  subscriptions,
  onDirtyChange,
  onSubmitPreferences,
}: NotificationPreferencesTabProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<NotificationPreferencesFormValues>({
    resolver: zodResolver(notificationPreferencesSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (open && preferences) {
      reset(mapPreferencesToFormValues(preferences));
    }
  }, [open, preferences, reset]);

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const [
    financeEnabled,
    contractEnabled,
    quoteUnpaidEnabled,
    quoteStaleEnabled,
  ] = useWatch({
    control,
    name: [
      "finance_due_enabled",
      "contract_due_enabled",
      "quote_unpaid_enabled",
      "quote_stale_enabled",
    ],
  });

  if (isLoading) {
    return (
      <div role="status" aria-busy="true" className="flex flex-col gap-3">
        <span className="sr-only">Carregando preferências de notificação</span>
        <div className="h-28 animate-pulse motion-reduce:animate-none rounded-lg bg-neutral-100" />
        <div className="h-16 animate-pulse motion-reduce:animate-none rounded-lg bg-neutral-100" />
        <div className="h-16 animate-pulse motion-reduce:animate-none rounded-lg bg-neutral-100" />
      </div>
    );
  }

  if (isError) {
    return (
      <div
        role="alert"
        className="flex flex-col items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      >
        <div className="flex items-center gap-2 font-medium">
          <AlertCircle
            className="h-4 w-4 shrink-0"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <span>Não foi possível carregar as preferências.</span>
        </div>
        <Button variant="secondary" onClick={onRetry}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-6">
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2 border-b border-neutral-200 pb-2">
          <h3 className="text-sm font-semibold text-neutral-950">
            Notificações neste aparelho
          </h3>
          {pushStatus === "subscribed" ? (
            <Badge variant="success">Ativo</Badge>
          ) : pushStatus === "denied" ? (
            <Badge variant="danger">Bloqueado</Badge>
          ) : pushStatus === "ios-install-required" ? (
            <Badge variant="warning">Instalar PWA</Badge>
          ) : null}
        </div>

        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          {pushStatus === "checking" ? (
            <p className="text-sm text-neutral-600">
              Verificando suporte deste navegador...
            </p>
          ) : null}

          {pushStatus === "ios-install-required" ? (
            <div className="flex flex-col gap-2 text-xs leading-relaxed text-neutral-700">
              <p className="text-sm font-medium text-neutral-950">
                Instale o FixFlow na Tela de Início para receber avisos no iPhone.
              </p>
              <p>
                1. No Safari, toque no botão Compartilhar e escolha Adicionar à Tela de Início.
              </p>
              <p>
                2. Abra o FixFlow pelo ícone instalado na tela inicial e volte aqui para ativar.
              </p>
            </div>
          ) : null}

          {pushStatus === "unsupported" ? (
            <p className="text-xs leading-relaxed text-neutral-700">
              Este navegador não suporta notificações em segundo plano. Você continua acompanhando todas as pendências pela central do sino.
            </p>
          ) : null}

          {pushStatus === "denied" ? (
            <p className="text-xs leading-relaxed text-neutral-700">
              A permissão de notificações foi bloqueada neste navegador. Libere o acesso para este site nas configurações do aparelho e recarregue o FixFlow.
            </p>
          ) : null}

          {pushStatus === "unsubscribed" ? (
            <div className="flex flex-col gap-3">
              <p className="text-xs leading-relaxed text-neutral-700">
                Receba avisos individuais no celular às 08h e às 18h para cada conta, contrato ou orçamento pendente (até 5 por disparo).
              </p>
              <Button
                onClick={onSubscribePush}
                isLoading={isPushMutating}
                className="w-full"
              >
                <BellRing
                  className="h-4 w-4 shrink-0"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <span>Ativar neste aparelho</span>
              </Button>
            </div>
          ) : null}

          {pushStatus === "subscribed" ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-xs text-neutral-700">
                <Smartphone
                  className="h-4 w-4 shrink-0 text-neutral-600"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <span className="truncate font-medium text-neutral-950">
                  {pushEnv.deviceLabel}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={onTestPush}
                  isLoading={isTestingPush}
                  disabled={isPushMutating}
                  className="flex-1"
                >
                  <Send
                    className="h-4 w-4 shrink-0"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <span>Testar notificação</span>
                </Button>

                <Button
                  variant="ghost"
                  onClick={onUnsubscribePush}
                  isLoading={isPushMutating}
                  disabled={isTestingPush}
                >
                  Desativar
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        {subscriptions.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-neutral-600 tabular-nums">
              Aparelhos inscritos ({subscriptions.length})
            </p>
            <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
              {subscriptions.map((sub) => {
                const isCurrentDevice = sub.endpoint === currentEndpoint;
                return (
                  <li
                    key={sub.id}
                    className="flex items-center justify-between gap-3 px-3.5 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-neutral-950">
                        {sub.device_label ?? "Aparelho conectado"}
                      </p>
                      <p className="text-xs text-neutral-600 tabular-nums">
                        {sub.last_success_at
                          ? `Último envio em ${formatDateBR(sub.last_success_at)}`
                          : "Aguardando primeiro envio"}
                      </p>
                    </div>
                    {isCurrentDevice ? (
                      <Badge variant="neutral">Este aparelho</Badge>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </section>

      <form
        id={formId}
        onSubmit={handleSubmit(onSubmitPreferences)}
        noValidate
        className="flex flex-col gap-6"
      >
        <section className="flex flex-col gap-3">
          <h3 className="border-b border-neutral-200 pb-2 text-sm font-semibold text-neutral-950">
            Horários dos lembretes push
          </h3>

          <Controller
            control={control}
            name="push_morning_enabled"
            render={({ field }) => (
              <CheckboxRow
                label="Alertas da manhã (08h)"
                hint="Envia avisos individuais de vencimentos próximos, contas do dia, atrasos e orçamentos parados."
                checked={field.value}
                onChange={field.onChange}
              />
            )}
          />

          <Controller
            control={control}
            name="push_evening_enabled"
            render={({ field }) => (
              <CheckboxRow
                label="Alertas de fim de tarde (18h)"
                hint="Reforça novidades do dia e pendências que seguem vencendo hoje, atrasadas ou sem pagamento."
                checked={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </section>

        <section className="flex flex-col gap-4">
          <h3 className="border-b border-neutral-200 pb-2 text-sm font-semibold text-neutral-950">
            Regras e prazos da central
          </h3>

          <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-3.5">
            <Controller
              control={control}
              name="finance_due_enabled"
              render={({ field }) => (
                <CheckboxRow
                  label="Vencimentos do financeiro"
                  hint="Contas a pagar, despesas fixas e recebimentos manuais do Livro-Caixa."
                  checked={field.value}
                  onChange={field.onChange}
                />
              )}
            />

            <Input
              label="Avisar com quantos dias de antecedência"
              type="number"
              inputMode="numeric"
              min={0}
              max={30}
              disabled={!financeEnabled}
              className="tabular-nums"
              hint="Com 0, alerta apenas no dia do vencimento e em atraso."
              error={errors.finance_advance_days?.message}
              {...register("finance_advance_days", { valueAsNumber: true })}
            />
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-3.5">
            <Controller
              control={control}
              name="contract_due_enabled"
              render={({ field }) => (
                <CheckboxRow
                  label="Contratos mensais"
                  hint="Mensalidades de clientes ativos sincronizadas no mês."
                  checked={field.value}
                  onChange={field.onChange}
                />
              )}
            />

            <Input
              label="Avisar com quantos dias de antecedência"
              type="number"
              inputMode="numeric"
              min={0}
              max={30}
              disabled={!contractEnabled}
              className="tabular-nums"
              hint="Com 0, alerta no dia da cobrança e em atraso."
              error={errors.contract_advance_days?.message}
              {...register("contract_advance_days", { valueAsNumber: true })}
            />
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-3.5">
            <Controller
              control={control}
              name="quote_unpaid_enabled"
              render={({ field }) => (
                <CheckboxRow
                  label="Orçamentos concluídos sem pagamento"
                  hint="Serviços finalizados que ainda não foram marcados como pagos."
                  checked={field.value}
                  onChange={field.onChange}
                />
              )}
            />

            <Input
              label="Dias após concluir para alertar"
              type="number"
              inputMode="numeric"
              min={0}
              max={60}
              disabled={!quoteUnpaidEnabled}
              className="tabular-nums"
              hint="Com 0, alerta no mesmo dia em que o serviço é concluído."
              error={errors.quote_completed_unpaid_days?.message}
              {...register("quote_completed_unpaid_days", {
                valueAsNumber: true,
              })}
            />
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-3.5">
            <Controller
              control={control}
              name="quote_stale_enabled"
              render={({ field }) => (
                <CheckboxRow
                  label="Orçamentos em aberto há muito tempo"
                  hint="Rascunhos parados, propostas enviadas sem resposta (ou vencidas) e aprovações sem execução."
                  checked={field.value}
                  onChange={field.onChange}
                />
              )}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Input
                label="Rascunho (dias)"
                type="number"
                inputMode="numeric"
                min={1}
                max={90}
                disabled={!quoteStaleEnabled}
                className="tabular-nums"
                error={errors.quote_draft_stale_days?.message}
                {...register("quote_draft_stale_days", { valueAsNumber: true })}
              />

              <Input
                label="Enviado (dias)"
                type="number"
                inputMode="numeric"
                min={1}
                max={90}
                disabled={!quoteStaleEnabled}
                className="tabular-nums"
                error={errors.quote_sent_stale_days?.message}
                {...register("quote_sent_stale_days", { valueAsNumber: true })}
              />

              <Input
                label="Aprovado (dias)"
                type="number"
                inputMode="numeric"
                min={1}
                max={180}
                disabled={!quoteStaleEnabled}
                className="tabular-nums"
                error={errors.quote_approved_stale_days?.message}
                {...register("quote_approved_stale_days", {
                  valueAsNumber: true,
                })}
              />
            </div>
          </div>
        </section>
      </form>
    </div>
  );
}
