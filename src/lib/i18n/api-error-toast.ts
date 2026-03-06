"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";

/**
 * Hook that provides a function to display translated API error messages via toast.
 * Must be called inside a React component (requires next-intl context).
 */
export function useApiErrorToast() {
  const t = useTranslations("common");

  function showApiError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes("unauthorized") || lowerMessage.includes("sign in") || lowerMessage.includes("not authenticated")) {
      toast.error(t("errors.unauthorized"));
    } else if (lowerMessage.includes("permission") || lowerMessage.includes("forbidden")) {
      toast.error(t("errors.forbidden"));
    } else if (lowerMessage.includes("not found")) {
      toast.error(t("errors.notFound"));
    } else if (lowerMessage.includes("rate limit") || lowerMessage.includes("too many")) {
      toast.error(t("errors.rateLimited"));
    } else if (lowerMessage.startsWith("failed to ")) {
      const action = message.substring("Failed to ".length).replace(/\.\s*$/, "");
      toast.error(t("errors.failedTo", { action }));
    } else {
      toast.error(t("errors.serverError"));
    }
  }

  return { showApiError };
}
