import { ImageResponse } from "next/og";
import { getDishById } from "@/lib/dishes";

export const runtime = "nodejs";
export const alt = "Addis Eats Dish Preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }) {
  const { id } = await params;
  const dish = await getDishById(id);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px",
          background: "#0b0b0f",
          color: "#f2f2f5",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "36px", fontWeight: "bold", color: "#a48fff" }}>
            Addis Eats
          </span>
          <span
            style={{
              fontSize: "24px",
              background: "#221f2e",
              padding: "10px 24px",
              borderRadius: "999px",
              color: "#a48fff",
            }}
          >
            {dish?.category || "Ethiopian"}
          </span>
        </div>

        <div>
          <h1 style={{ fontSize: "64px", fontWeight: "bold", margin: "0 0 16px" }}>
            {dish?.name || "Authentic Dish"}
          </h1>
          <p style={{ fontSize: "28px", color: "#9a99a6", margin: 0, maxWidth: "900px" }}>
            {dish?.description}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "2px solid #2b2b34",
            paddingTop: "24px",
          }}
        >
          <span style={{ fontSize: "36px", fontWeight: "bold", color: "#22c55e" }}>
            {dish?.price} ETB
          </span>
          <span style={{ fontSize: "24px", color: "#9a99a6" }}>
            Fresh delivery across Addis Ababa
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
