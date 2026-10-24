import "server-only";
import { cookies } from "next/headers";
import { LANG_COOKIE, normalizeLang, t } from "@/lib/i18n";

/** The visitor's language ("en" unless they chose Amharic). */
export async function getLang() {
  try {
    return normalizeLang((await cookies()).get(LANG_COOKIE)?.value);
  } catch {
    return "en";
  }
}

/** A translate function for server components: const tr = await getTranslator(); tr("Menu"). */
export async function getTranslator() {
  const lang = await getLang();
  return (text, values) => t(lang, text, values);
}
