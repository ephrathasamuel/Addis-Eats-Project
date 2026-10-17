import { Suspense } from "react";
import { getCategories } from "@/lib/dishes";
import { CategoryBar } from "@/components/CategoryBar";

// This layout wraps both /menu and /menu/[id] -  the sidebar is not part of
// page.js, so navigating to a dish does not remount it.
// CategoryBar reads useSearchParams(), so it needs its own Suspense boundary
// or the static /menu/[id] pages would be forced into dynamic rendering.
export default async function MenuLayout({ children }) {
  const categories = await getCategories();

  return (
    <div className="menu-layout">
      <Suspense fallback={<nav className="category-bar" aria-label="Menu categories" />}>
        <CategoryBar categories={categories} />
      </Suspense>
      <div>{children}</div>
    </div>
  );
}
