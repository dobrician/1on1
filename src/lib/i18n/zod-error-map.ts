"use client";

import { useTranslations } from "next-intl";
import { z } from "zod";

/**
 * Hook that sets Zod's global error map to use translated validation messages.
 * Must be called inside a React component (requires next-intl context).
 * Call once at the top of any form component that uses Zod validation.
 */
export function useZodI18nErrors() {
  const t = useTranslations("validation");

  z.setErrorMap((issue) => {
    switch (issue.code) {
      case "too_small":
        if (issue.origin === "string" && issue.minimum === 1) {
          return { message: t("required") };
        }
        if (issue.origin === "string") {
          return { message: t("minLength", { min: Number(issue.minimum) }) };
        }
        break;

      case "too_big":
        if (issue.origin === "string") {
          return { message: t("maxLength", { max: Number(issue.maximum) }) };
        }
        break;

      case "invalid_format":
        if (issue.format === "email") {
          return { message: t("invalidEmail") };
        }
        if (issue.format === "url") {
          return { message: t("invalidUrl") };
        }
        break;

      case "invalid_type":
        if (issue.expected === "nonoptional") {
          return { message: t("required") };
        }
        return { message: t("invalidType") };
    }

    return null;
  });
}
