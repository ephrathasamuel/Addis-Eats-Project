import { NextResponse } from "next/server";
import { getDishes } from "@/lib/dishes";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const category = searchParams.get("category");
  const page = searchParams.get("page");
  const limit = parseInt(searchParams.get("limit") || "4", 10);

  let dishes = await getDishes(category);

  if (q) {
    const term = q.toLowerCase();
    dishes = dishes.filter(
      (d) =>
        d.name.toLowerCase().includes(term) ||
        d.description.toLowerCase().includes(term) ||
        d.category.toLowerCase().includes(term)
    );
  }

  if (page) {
    const pageNum = Math.max(1, parseInt(page, 10));
    const total = dishes.length;
    const totalPages = Math.ceil(total / limit);
    const start = (pageNum - 1) * limit;
    const pagedDishes = dishes.slice(start, start + limit);

    return NextResponse.json({
      dishes: pagedDishes,
      total,
      page: pageNum,
      totalPages,
      hasNext: pageNum < totalPages,
      hasPrev: pageNum > 1,
    });
  }

  return NextResponse.json(dishes);
}
