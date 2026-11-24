import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createClient,
  deleteClient,
  listClients,
  updateClient,
  type ClientInsert,
  type ClientUpdate,
} from "@/services/clients.service";

export const CLIENTS_QUERY_KEY = ["clients"] as const;

export function useClients(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: CLIENTS_QUERY_KEY,
    queryFn: listClients,
    enabled: options?.enabled ?? true,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ClientInsert) => createClient(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY });
      toast.success("Cliente cadastrado.");
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível cadastrar o cliente.";
      toast.error(message);
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ClientUpdate }) =>
      updateClient(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY });
      toast.success("Cliente atualizado.");
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o cliente.";
      toast.error(message);
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteClient(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY });
      toast.success("Cliente excluído.");
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível excluir o cliente.";
      toast.error(message);
    },
  });
}
