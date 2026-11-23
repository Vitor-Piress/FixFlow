import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MATERIALS_QUERY_KEY } from "@/features/catalog/hooks/useMaterials";
import {
  createSupplier,
  deleteSupplier,
  listSuppliers,
  updateSupplier,
  type SupplierInsert,
  type SupplierUpdate,
} from "@/services/suppliers.service";

export const SUPPLIERS_QUERY_KEY = ["suppliers"] as const;

export function useSuppliers() {
  return useQuery({
    queryKey: SUPPLIERS_QUERY_KEY,
    queryFn: listSuppliers,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SupplierInsert) => createSupplier(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SUPPLIERS_QUERY_KEY });
      toast.success("Fornecedor cadastrado.");
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível cadastrar o fornecedor.";
      toast.error(message);
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SupplierUpdate }) =>
      updateSupplier(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SUPPLIERS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: MATERIALS_QUERY_KEY });
      toast.success("Fornecedor atualizado.");
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o fornecedor.";
      toast.error(message);
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteSupplier(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SUPPLIERS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: MATERIALS_QUERY_KEY });
      toast.success("Fornecedor excluído.");
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível excluir o fornecedor.";
      toast.error(message);
    },
  });
}
