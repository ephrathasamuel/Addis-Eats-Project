import Link from "next/link";
import { DishImage } from "@/components/DishImage";
import { FavoriteButton } from "@/components/FavoriteButton";
import { AddToCartButton } from "@/components/AddToCartButton";

export function DishCard({ dish, priority = false }) {
  return (
    <article
      className="dish-card"
      aria-label={`${dish.name}, ${dish.category}`}
      style={{ opacity: dish.isSoldOut ? 0.8 : 1 }}
    >
      <div className="dish-card__image-wrap">
        <Link
          href={`/menu/${dish.id}`}
          className="dish-card__image-link"
          tabIndex={-1}
          aria-hidden="true"
        >
          <DishImage dish={dish} size="card" priority={priority} />
        </Link>

        {dish.isSoldOut ? (
          <span
            className="dish-badge"
            style={{
              backgroundColor: "#dc2626",
              color: "#ffffff",
              fontWeight: "750",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Sold Out
          </span>
        ) : dish.tag ? (
          <span className="dish-badge">{dish.tag}</span>
        ) : null}

        <FavoriteButton dish={dish} size="card" />
      </div>

      <div className="dish-card__body">
        <div className="dish-card__header">
          <span className="dish-category-pill">{dish.category}</span>
          {dish.spicy && <span className="dish-spicy-indicator" title="Spicy Berbere / Mitmita">Spicy</span>}
        </div>

        <h2 className="dish-title">
          <Link href={`/menu/${dish.id}`} className="dish-title-link">
            {dish.name}
          </Link>
        </h2>

        <p className="dish-description">{dish.description}</p>

        <div className="dish-card__footer">
          <div className="dish-price-wrap">
            <span className="dish-price-currency">ETB</span>
            <span className="dish-price-val">{dish.price}</span>
          </div>
          <AddToCartButton dish={dish} size="compact" />
        </div>
      </div>
    </article>
  );
}

export default DishCard;
