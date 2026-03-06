"use client";

import { useTranslations } from "next-intl";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SaveStatusProps {
  status: "saved" | "saving" | "error";
}

/**
 * Small status indicator component for the wizard top bar.
 * Shows the current save state with icon and label.
 */
export function SaveStatus({ status }: SaveStatusProps) {
  const t = useTranslations("sessions.wizard");

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs transition-opacity duration-200",
        status === "error" ? "text-destructive" : "text-muted-foreground"
      )}
    >
      {status === "saving" && (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>{t("saving")}</span>
        </>
      )}
      {status === "saved" && (
        <>
          <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
          <span>{t("saved")}</span>
        </>
      )}
      {status === "error" && (
        <>
          <AlertCircle className="h-3 w-3" />
          <span>{t("errorSaving")}</span>
        </>
      )}
    </div>
  );
}
