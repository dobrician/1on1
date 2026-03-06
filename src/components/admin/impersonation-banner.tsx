import { auth } from "@/lib/auth/config";
import { StopImpersonationButton } from "./stop-impersonation-button";
import { getTranslations } from "next-intl/server";

export async function ImpersonationBanner() {
  const session = await auth();
  if (!session?.user.impersonatedBy) return null;

  const t = await getTranslations("admin");
  const { name: adminName } = session.user.impersonatedBy;
  const userName = session.user.name ?? session.user.email ?? "";

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between bg-amber-500 px-4 py-2 text-sm font-medium text-amber-950">
      <span>
        {t("impersonation.banner", { name: userName, admin: adminName })}
      </span>
      <StopImpersonationButton label={t("impersonation.returnToAdmin")} />
    </div>
  );
}
