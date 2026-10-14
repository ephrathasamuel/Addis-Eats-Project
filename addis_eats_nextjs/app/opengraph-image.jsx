import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Addis Eats -  Ethiopian Food Delivery";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #1c143c 0%, #0b0b0f 100%)",
          color: "#ffffff",
          textAlign: "center",
          padding: "60px",
        }}
      >
        <h1 style={{ fontSize: "80px", fontWeight: "bold", margin: "0 0 20px", color: "#a48fff" }}>
          Addis Eats
        </h1>
        <p style={{ fontSize: "36px", color: "#e7e3f5", margin: 0, maxWidth: "850px" }}>
          Authentic Ethiopian Food, Cooked Slow & Delivered Fast
        </p>
        <div
          style={{
            marginTop: "40px",
            background: "#7c5cff",
            padding: "12px 32px",
            borderRadius: "999px",
            fontSize: "24px",
            fontWeight: "bold",
          }}
        >
          order.addiseats.et
        </div>
      </div>
    ),
    { ...size }
  );
}
