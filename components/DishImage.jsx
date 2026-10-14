"use client";

import { useState } from "react";
import Image from "next/image";

// Day 43 Optimization: Replaced standard <img> with Next.js <Image />
// Implements automatic WebP/AVIF compression, responsive srcset via sizes,
// lazy loading by default, and pre-allocated box dimensions to eliminate Cumulative Layout Shift (CLS).
export function DishImage({ dish, size = "card", priority = false }) {
  const [failed, setFailed] = useState(false);
  const height = size === "hero" ? 320 : 200;

  if (dish.image && !failed) {
    return (
      <div
        className={`dish-image dish-image--${size}`}
        style={{ position: "relative", width: "100%", height, overflow: "hidden" }}
      >
        <Image
          src={dish.image}
          alt={`${dish.name}, a traditional ${dish.category.toLowerCase()} dish`}
          fill
          priority={priority}
          sizes={
            size === "hero"
              ? "(max-width: 768px) 100vw, 800px"
              : "(max-width: 640px) calc(100vw - 32px), (max-width: 1024px) 50vw, 320px"
          }
          style={{ objectFit: "cover" }}
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`dish-image dish-image--${size} dish-image--fallback`}
      style={{
        height,
        background: `linear-gradient(135deg, ${dish.color} 0%, ${shade(dish.color, -22)} 100%)`,
      }}
      role="img"
      aria-label={`${dish.name}, a traditional ${dish.category.toLowerCase()} dish`}
    >
      <span className="dish-image__monogram">{dish.name.charAt(0)}</span>
    </div>
  );
}

function shade(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const r = Math.max(0, Math.min(255, (num >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
  const b = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
