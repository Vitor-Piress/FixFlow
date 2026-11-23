import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getBusinessProfile,
  updateBusinessProfile,
  type BusinessProfileUpdate,
} from "@/services/businessProfile.service";

export const BUSINESS_PROFILE_QUERY_KEY = ["business-profile"] as const;

export function useBusinessProfile(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: BUSINESS_PROFILE_QUERY_KEY,
    queryFn: getBusinessProfile,
    enabled: options?.enabled ?? true,
  });
}

export function useUpdateBusinessProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: BusinessProfileUpdate) =>
      updateBusinessProfile(payload),
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(BUSINESS_PROFILE_QUERY_KEY, updatedProfile);
      void queryClient.invalidateQueries({
        queryKey: BUSINESS_PROFILE_QUERY_KEY,
      });
      toast.success("Dados do emitente salvos.");
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível salvar os dados do emitente.";
      toast.error(message);
    },
  });
}
