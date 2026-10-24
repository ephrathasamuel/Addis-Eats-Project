"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/components/Providers";

// The only interactivity here is "which category is selected" - that's a
// URL search param, not component state, so the sidebar survives navigation
// to a dish and back without losing its place.

export function CategoryBar({ categories }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get("category");
  const tr = useT();

  function select(category) {
    const params = new URLSearchParams(searchParams.toString());
    if (category) {
      params.set("category", category);
    } else {
      params.delete("category");
    }
    router.push(`/menu?${params.toString()}`);
  }

  return (
    <nav className="category-bar" aria-label="Menu categories">
      <button
        type="button"
        className={!active ? "category active" : "category"}
        onClick={() => select(null)}
      >
        {tr("All")}
      </button>
      {categories.map((category) => (
        <button
          key={category}
          type="button"
          className={active === category ? "category active" : "category"}
          onClick={() => select(category)}
        >
          {tr(category)}
        </button>
      ))}
    </nav>
  );
}
