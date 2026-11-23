import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface CopyFeedbackMessages {
  success: string;
  error: string;
}

export function useCopyFeedback(durationMs = 2000) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  async function copy(text: string, messages: CopyFeedbackMessages) {
    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard unavailable");
      }

      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(messages.success);

      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        setCopied(false);
        timeoutRef.current = null;
      }, durationMs);
    } catch {
      toast.error(messages.error);
    }
  }

  return { copied, copy };
}
