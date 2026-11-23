import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createMaterial,
  listMaterials,
  setMaterialActive,
  updateMaterial,
  type ListMaterialsOptions,
  type MaterialInsert,
  type MaterialUpdate,
} from "@/services/materials.service";

export const MATERIALS_QUERY_KEY = ["materials"] as const;

export function useMaterials(options?: ListMaterialsOptions) {
  const activeOnly = Boolean(options?.activeOnly);

  return useQuery({
    queryKey: [...MATERIALS_QUERY_KEY, { activeOnly }] as const,
    queryFn: () => listMaterials({ activeOnly }),
  });
}

export function useCreateMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: MaterialInsert) => createMaterial(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MATERIALS_QUERY_KEY });
      toast.success("Material cadastrado.");
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível cadastrar o material.";
      toast.error(message);
    },
  });
}

export function useUpdateMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: MaterialUpdate }) =>
      updateMaterial(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MATERIALS_QUERY_KEY });
      toast.success("Material atualizado.");
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o material.";
      toast.error(message);
    },
  });
}

export function useToggleMaterialActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      setMaterialActive(id, isActive),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: MATERIALS_QUERY_KEY });
      toast.success(
        variables.isActive ? "Material reativado." : "Material desativado.",
      );
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível alterar o status do material.";
      toast.error(message);
    },
  });
}
