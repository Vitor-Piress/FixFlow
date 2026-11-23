import { useEffect } from "react";
import { toast } from "sonner";
import { useRegisterSW } from "virtual:pwa-register/react";

const PWA_UPDATE_TOAST_ID = "pwa-update";

export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    if (!needRefresh) {
      return;
    }

    toast("Nova versão do FixFlow disponível.", {
      id: PWA_UPDATE_TOAST_ID,
      duration: Infinity,
      action: {
        label: "Atualizar",
        onClick: () => {
          void updateServiceWorker(true);
        },
      },
      cancel: {
        label: "Depois",
        onClick: () => {
          setNeedRefresh(false);
        },
      },
    });

    return () => {
      toast.dismiss(PWA_UPDATE_TOAST_ID);
    };
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);

  return null;
}
