"use client";

import { useRouter } from "next/navigation";
import { LANG_COOKIE } from "@/lib/i18n";
import { useLang } from "@/components/Providers";

// English / አማርኛ switch. The choice is kept in a cookie for a year.
export function LanguageToggle() {
  const router = useRouter();
  const { lang, setLang } = useLang();
  const next = lang === "am" ? "en" : "am";

  function toggle() {
    try {
      document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    } catch {}
    setLang(next);
    document.documentElement.lang = next;
    router.refresh();
  }

  return (
    <button
      type="button"
      className="lang-toggle"
      onClick={toggle}
      lang={next}
      aria-label={next === "am" ? "ወደ አማርኛ ቀይር (Switch to Amharic)" : "Switch to English"}
      title={next === "am" ? "አማርኛ" : "English"}
    >
      {next === "am" ? "አማ" : "EN"}
    </button>
  );
}
