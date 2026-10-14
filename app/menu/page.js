import { Suspense } from "react";
import { DishList } from "@/components/DishList";
import { SearchBox } from "./SearchBox";

export const metadata = {
  title: "Menu",
  description: "Browse authentic Ethiopian dishes including slow-simmered Doro Wat, spiced Kitfo, sizzling Tibs, Shiro, and buna.",
  alternates: {
    canonical: "/menu",
  },
};

export default async function MenuPage({ searchParams }) {
  const params = await searchParams;
  const category = params?.category || undefined;
  const page = parseInt(params?.page || "1", 10);

  return (
    <section>
      <h1>Menu</h1>
      <SearchBox />
      <Suspense key={`${category ?? "all"}-${page}`} fallback={<p>Loading dishes…</p>}>
        <DishList category={category} page={page} />
      </Suspense>
    </section>
  );
}
