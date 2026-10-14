import { NextResponse } from "next/server";
import { getDishById } from "@/lib/dishes";

export async function GET(request, { params }) {
  const dish = await getDishById(params.id);

  if (!dish) {
    return NextResponse.json(
      { error: `No dish with id "${params.id}".` },
      { status: 404 }
    );
  }

  return NextResponse.json(dish);
}
