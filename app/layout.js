import "./globals.css";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Providers } from "@/components/Providers";
import { WelcomeNotice } from "@/components/WelcomeNotice";
import { HideOnStaffSignIn } from "@/components/HideOnStaffSignIn";
import { ScrollToTop } from "@/components/ScrollToTop";
import { getSession } from "@/lib/session";

// Fonts are downloaded at build time and served from this site (no requests
// to Google from visitors). Plus Jakarta Sans for text, Fraunces for headings.
const bodyFont = Plus_Jakarta_Sans({ subsets: ["latin"], display: "swap", variable: "--font-body" });
const displayFont = Fraunces({ subsets: ["latin"], display: "swap", variable: "--font-display" });

export const metadata = {
  title: "Addis Eats",
  description: "Ethiopian food, ordered online.",
};

// Sets data-theme on <html> before the page paints, from whatever the
// visitor chose last time (localStorage) or their OS preference if they
// haven't chosen yet. Runs as a plain blocking script, not a React effect,
// specifically so there is no flash of the wrong theme while React hydrates:
// an effect would run a frame too late for that.
const themeInitScript = `
  (function () {
    try {
      if (typeof window !== 'undefined') {
        if (!window.crypto) { window.crypto = {}; }
        if (typeof window.crypto.randomUUID !== 'function') {
          window.crypto.randomUUID = function() {
            return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, function(c) {
              return (c ^ (window.crypto.getRandomValues ? window.crypto.getRandomValues(new Uint8Array(1))[0] : Math.floor(Math.random()*16)) & 15 >> (c / 4)).toString(16);
            });
          };
        }
      }
      var stored = localStorage.getItem('theme');
      var theme = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', theme);
    } catch (e) {}
  })();
`;

export default async function RootLayout({ children }) {
  // Resolved on the server so role-aware UI (header links, Add to cart vs.
  // sold-out toggles) is correct on the very first paint.
  const session = await getSession();
  const initialUser = session
    ? { id: session.id, name: session.name, email: session.email, role: session.role, photo: session.photo || "" }
    : null;

  return (
    // suppressHydrationWarning is scoped to this one element only (it does
    // not suppress warnings any deeper in the tree). It's needed here
    // because themeInitScript intentionally sets data-theme on <html>
    // before React hydrates -  the server-rendered HTML has no data-theme
    // attribute at all (the server doesn't know the visitor's saved
    // preference), so without this, React correctly notices the mismatch
    // and warns about it even though it's expected and harmless.
    <html lang="en" className={`${bodyFont.variable} ${displayFont.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <Providers initialUser={initialUser}>
          <a href="#main" className="skip-link">Skip to content</a>
          <Header />
          <main id="main">
            <WelcomeNotice />
            {children}
          </main>
          <HideOnStaffSignIn>
            <Footer />
          </HideOnStaffSignIn>
          <ScrollToTop />
        </Providers>
      </body>
    </html>
  );
}
