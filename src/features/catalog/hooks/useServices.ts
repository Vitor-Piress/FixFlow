import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createService,
  listServices,
  setServiceActive,
  updateService,
  type ListServicesOptions,
  type ServiceInsert,
  type ServiceUpdate,
} from "@/services/services.service";

export const SERVICES_QUERY_KEY = ["services"] as const;

export function useServices(options?: ListServicesOptions) {
  const activeOnly = Boolean(options?.activeOnly);

  return useQuery({
    queryKey: [...SERVICES_QUERY_KEY, { activeOnly }] as const,
    queryFn: () => listServices({ activeOnly }),
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ServiceInsert) => createService(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SERVICES_QUERY_KEY });
      toast.success("Serviço cadastrado.");
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível cadastrar o serviço.";
      toast.error(message);
    },
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ServiceUpdate }) =>
      updateService(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SERVICES_QUERY_KEY });
      toast.success("Serviço atualizado.");
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o serviço.";
      toast.error(message);
    },
  });
}

export function useToggleServiceActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      setServiceActive(id, isActive),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: SERVICES_QUERY_KEY });
      toast.success(
        variables.isActive ? "Serviço reativado." : "Serviço desativado.",
      );
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível alterar o status do serviço.";
      toast.error(message);
    },
  });
}
