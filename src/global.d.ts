import type en_common from "../messages/en/common.json";
import type en_auth from "../messages/en/auth.json";

type Messages = typeof en_common & typeof en_auth;

declare module "next-intl" {
  interface AppConfig {
    Locale: "en" | "ro";
    Messages: Messages;
  }
}
