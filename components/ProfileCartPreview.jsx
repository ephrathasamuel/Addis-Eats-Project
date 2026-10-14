"use client";

import Link from "next/link";
import { useCart } from "@/components/Providers";
import { getDishByIdSync, getDishByNameSync } from "@/lib/dishes";

export function ProfileCartPreview() {
  const { items, total, hydrated } = useCart();

  if (!hydrated) {
    return <p className="empty">Loading your cart…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="empty-cart-preview" style={{ padding: "1.25rem 0" }}>
        <p className="empty">Your cart is empty.</p>
        <Link href="/menu" className="btn-primary" style={{ display: "inline-block", marginTop: "0.5rem" }}>
          Browse Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="profile-cart-preview">
      <div className="profile-cart-list">
        {items.map((item) => {
          const dish = getDishByIdSync(item.id) || getDishByNameSync(item.name);
          const imgSrc = item.image || dish?.image || "/images/food/doro-wat.jpg";
          return (
            <div className="order-item-card" key={item.id}>
              <div className="order-item-media">
                <div className="order-item-frame">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imgSrc} alt={item.name} className="order-item-thumb" />
                </div>
                <span className="order-item-name">{item.name}</span>
              </div>

              <div className="order-item-tables">
                <div className="num-pill" role="cell">
                  <span className="num-pill__label">Qty</span>
                  <span className="num-pill__val">{item.qty}</span>
                </div>
                <div className="num-pill" role="cell">
                  <span className="num-pill__label">Each</span>
                  <span className="num-pill__val">{item.price} ETB</span>
                </div>
                <div className="num-pill num-pill--total" role="cell">
                  <span className="num-pill__label">Total</span>
                  <span className="num-pill__val">{item.price * item.qty} ETB</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="profile-cart-total-bar">
        <span>Total Due</span>
        <span className="grand-total-val">{total} ETB</span>
      </div>

      <div className="profile-cart-actions">
        <Link href="/cart" className="btn-ghost">
          View cart
        </Link>
        <Link href="/checkout" className="btn-primary">
          Checkout
        </Link>
      </div>
    </div>
  );
}
