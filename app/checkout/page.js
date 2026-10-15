import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDishByIdSync, getDishByNameSync } from "@/lib/dishes";
import { getSession } from "@/lib/session";
import OrderForm from "./OrderForm";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({ searchParams }) {
  const params = await searchParams;
  const user = await getSession();
  if (!user) {
    const checkoutParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params || {})) {
      if (typeof value === "string") checkoutParams.set(key, value);
    }
    const checkoutPath = `/checkout${checkoutParams.size ? `?${checkoutParams}` : ""}`;
    redirect(`/signin?next=${encodeURIComponent(checkoutPath)}`);
  }

  const itemsRaw = params?.items || "[]";
  let items = [];
  try {
    items = JSON.parse(itemsRaw);
  } catch {
    items = [];
  }

  let fieldErrors = {};
  try {
    fieldErrors = params?.error ? JSON.parse(params.error) : {};
  } catch {
    fieldErrors = {};
  }

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  const name = params?.name || "";
  const phone = params?.phone || "";

  return (
    <div className="checkout-layout">
      <div className="checkout-header-banner">
        <div>
          <h1 className="checkout-title">Order Checkout</h1>
          <p className="checkout-subtitle">
            Review your selected dishes | Enter delivery address | Pay via TeleBirr or Cash
          </p>
        </div>
      </div>

      {items.length === 0 && !fieldErrors.items ? (
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
      ) : (
        <div className="checkout-grid">
          {/* Left Column: Order Items & Visual Table */}
          <section className="checkout-card" aria-labelledby="order-summary-heading">
            <div className="checkout-card__header">
              <h2 id="order-summary-heading">Selected Dishes ({items.reduce((acc, i) => acc + i.qty, 0)})</h2>
              <Link href="/cart" className="checkout-edit-link">
                Edit Cart
              </Link>
            </div>

            <div className="checkout-dish-list">
              {items.map((item) => {
                const dish = getDishByIdSync(item.id) || getDishByNameSync(item.name);
                const imageUrl = item.image || dish?.image || "/images/food/doro-wat.jpg";
                const category = item.category || dish?.category;

                return (
                  <article key={item.id} className="checkout-dish-card">
                    {/* Food Thumbnail & Name Below */}
                    <div className="checkout-dish-media">
                      <div className="checkout-dish-thumb-wrap">
                        <Image
                          src={imageUrl}
                          alt={item.name}
                          width={92}
                          height={92}
                          className="checkout-dish-thumb"
                          style={{ objectFit: "cover" }}
                        />
                      </div>
                      <div className="checkout-dish-info">
                        <h3 className="checkout-dish-name">{item.name}</h3>
                        {category && (
                          <span className="checkout-dish-category-chip">{category}</span>
                        )}
                      </div>
                    </div>

                    {/* Numbers in Small Boxes / Table beside it */}
                    <div className="checkout-numbers-table" role="table" aria-label={`Pricing for ${item.name}`}>
                      <div className="num-pill" role="cell">
                        <span className="num-pill__label">Quantity</span>
                        <span className="num-pill__val">{item.qty}</span>
                      </div>
                      <div className="num-pill" role="cell">
                        <span className="num-pill__label">Unit Price</span>
                        <span className="num-pill__val">{item.price} ETB</span>
                      </div>
                      <div className="num-pill num-pill--total" role="cell">
                        <span className="num-pill__label">Item Total</span>
                        <span className="num-pill__val">{item.price * item.qty} ETB</span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="checkout-breakdown">
              <div className="breakdown-row">
                <span>Food Subtotal</span>
                <strong>{subtotal} ETB</strong>
              </div>
              <div className="breakdown-row breakdown-row--multiline">
                <div className="breakdown-label">
                  <span>Neighborhood Delivery</span>
                  <small className="breakdown-sub">(Calculated by location in form)</small>
                </div>
                <div className="breakdown-val">
                  <span>From +50 ETB</span>
                </div>
              </div>
            </div>
            {fieldErrors.items && <p className="field-error">{fieldErrors.items}</p>}
          </section>

          {/* Right Column: Customer Details Form */}
          <section className="checkout-card" aria-labelledby="delivery-details-heading">
            <div className="checkout-card__header">
              <h2 id="delivery-details-heading">Delivery Details</h2>
            </div>

            <OrderForm
              itemsRaw={itemsRaw}
              initialName={name}
              initialPhone={phone}
              fieldErrors={fieldErrors}
            />

            <div className="payment-options-note">
              <h4>Accepted Payment Methods</h4>
              <p>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: "inline-block", verticalAlign: "middle", marginRight: "0.4rem" }}>
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
                TeleBirr | CBE Birr | Cash on Delivery (COD)
              </p>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
