"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/Providers";
import { getDishByIdSync, getDishByNameSync } from "@/lib/dishes";

export default function CartPage() {
  const { items, updateQty, removeItem, total, hydrated } = useCart();
  const router = useRouter();

  if (!hydrated) {
    return (
      <div className="cart-layout">
        <p className="loading-state">Loading your cart...</p>
      </div>
    );
  }

  const deliveryFee = items.length > 0 ? (total > 600 ? 0 : 50) : 0;
  const grandTotal = total + deliveryFee;

  if (items.length === 0) {
    return (
      <div className="cart-layout">
        <div className="checkout-empty-state">
          <div className="empty-state-svg" aria-hidden="true">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          </div>
          <h2>Your cart is empty</h2>
          <p>Explore our Traditional Ethiopian stews or Western favorites to get started.</p>
          <Link href="/menu" className="btn-primary" style={{ marginTop: "1rem", display: "inline-block" }}>
            Browse Menu
          </Link>
        </div>
      </div>
    );
  }

  function goToCheckout() {
    const params = new URLSearchParams();
    const enriched = items.map((item) => {
      const dish = getDishByIdSync(item.id) || getDishByNameSync(item.name);
      return {
        id: item.id,
        name: item.name,
        price: item.price,
        qty: item.qty,
        image: item.image || dish?.image || "/images/food/doro-wat.jpg",
        category: item.category || dish?.category || "Traditional",
      };
    });
    params.set("items", JSON.stringify(enriched));
    router.push(`/checkout?${params.toString()}`);
  }

  return (
    <div className="cart-layout">
      <div className="checkout-header-banner">
        <div>
          <h1 className="checkout-title">Your Cart</h1>
          <p className="checkout-subtitle">
            Review your selected dishes | Adjust portions | Free delivery for orders over 600 ETB
          </p>
        </div>
      </div>

      <div className="cart-grid">
        {/* Left Column: Selected Dishes List */}
        <section className="checkout-card" aria-label="Cart items list">
          <div className="checkout-card__header">
            <h2>Selected Dishes ({items.reduce((sum, i) => sum + i.qty, 0)})</h2>
            <Link href="/menu" className="checkout-edit-link">
              + Add More Food
            </Link>
          </div>

          <div className="checkout-dish-list">
            {items.map((item) => {
              const dish = getDishByIdSync(item.id) || getDishByNameSync(item.name);
              const imageUrl = item.image || dish?.image || "/images/food/doro-wat.jpg";

              return (
                <article key={item.id} className="cart-dish-card">
                  {/* Left Column: Picture, then below it Name and Price */}
                  <div className="cart-dish-left">
                    <div className="cart-dish-thumb-wrap">
                      <Image
                        src={imageUrl}
                        alt={item.name}
                        width={76}
                        height={76}
                        className="cart-dish-thumb"
                        style={{ objectFit: "cover" }}
                      />
                    </div>
                    <div className="cart-dish-info">
                      <h3 className="cart-dish-name">{item.name}</h3>
                      <div className="cart-dish-price">{item.price} ETB</div>
                    </div>
                  </div>

                  {/* Right Column: Quantity then Trash Bin, then below it Total */}
                  <div className="cart-dish-right">
                    <div className="cart-dish-controls-row">
                      <div className="cart-dish-stepper">
                        <button
                          type="button"
                          className="qty-btn"
                          onClick={() => updateQty(item.id, item.qty - 1)}
                          aria-label={`Decrease ${item.name} quantity`}
                        >
                          -
                        </button>
                        <span className="qty-val">{item.qty}</span>
                        <button
                          type="button"
                          className="qty-btn"
                          onClick={() => updateQty(item.id, item.qty + 1)}
                          aria-label={`Increase ${item.name} quantity`}
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        className="cart-trash-btn"
                        onClick={() => removeItem(item.id)}
                        aria-label={`Remove ${item.name} from cart`}
                        title="Remove dish"
                      >
                        <svg
                          width="17"
                          height="17"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                      </button>
                    </div>

                    <div className="cart-dish-total-box">
                      <span className="cart-dish-total-label">Total:</span>
                      <span className="cart-dish-total-val">{item.price * item.qty} ETB</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Right Column: Order Summary */}
        <aside className="checkout-card cart-summary-card" aria-label="Cart summary">
          <div className="checkout-card__header">
            <h2>Order Summary</h2>
          </div>

          <div className="checkout-breakdown">
            <div className="breakdown-row">
              <span>Items Subtotal</span>
              <span>{total} ETB</span>
            </div>
            <div className="breakdown-row breakdown-row--multiline">
              <div className="breakdown-label">
                <span>Delivery Fee</span>
                <small className="breakdown-sub">(Addis Ababa)</small>
              </div>
              <div className="breakdown-val">
                {deliveryFee === 0 ? (
                  <>
                    <span>FREE</span>
                    <small className="breakdown-sub">(Orders &gt; 600 ETB)</small>
                  </>
                ) : (
                  <span>{deliveryFee} ETB</span>
                )}
              </div>
            </div>
            <div className="breakdown-row">
              <span>Estimated Arrival</span>
              <span>20 to 30 Mins</span>
            </div>
            <p style={{ margin: "0.2rem 0 0.85rem", color: "var(--muted)", fontSize: "0.82rem", lineHeight: 1.4 }}>
              Delivery time only accounts for driving time and does not include kitchen cooking time.
            </p>
            <div className="breakdown-row breakdown-row--grand">
              <span className="grand-label">Total Due</span>
              <span className="grand-total-val">{grandTotal} ETB</span>
            </div>
          </div>

          <button
            type="button"
            className="btn-primary"
            style={{ width: "100%", marginTop: "1.25rem", padding: "0.85rem", fontSize: "1rem" }}
            onClick={goToCheckout}
          >
            Proceed to Checkout
          </button>
          <Link
            href="/menu"
            style={{
              display: "block",
              textAlign: "center",
              marginTop: "0.85rem",
              fontSize: "0.88rem",
              color: "var(--muted)",
              textDecoration: "none",
            }}
          >
            Back to Menu
          </Link>
        </aside>
      </div>
    </div>
  );
}
