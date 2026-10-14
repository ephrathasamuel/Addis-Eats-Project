import { notFound } from "next/navigation";
import Link from "next/link";
import { getDishById, getAllDishIds } from "@/lib/dishes";
import { AddToCartButton } from "@/components/AddToCartButton";
import { DishImage } from "@/components/DishImage";
import { FavoriteButton } from "@/components/FavoriteButton";

export function generateStaticParams() {
  return getAllDishIds().map((id) => ({ id }));
}

// Day 44: Dynamic metadata generation per dish
export async function generateMetadata({ params }) {
  const { id } = await params;
  const dish = await getDishById(id);

  if (!dish) {
    return {
      title: "Dish Not Found",
      description: "The requested dish is not currently on the Addis Eats menu.",
    };
  }

  return {
    title: `${dish.name} : ${dish.price} ETB`,
    description: `${dish.description} Order online from Addis Eats.`,
    openGraph: {
      title: `${dish.name} | Addis Eats`,
      description: dish.description,
      images: [
        {
          url: dish.image,
          width: 800,
          height: 600,
          alt: dish.name,
        },
      ],
    },
  };
}

export default async function DishPage({ params }) {
  const { id } = await params;
  const dish = await getDishById(id);

  if (!dish) {
    notFound();
  }

  // Day 44: Structured Data (JSON-LD) for Schema.org MenuItem
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MenuItem",
    name: dish.name,
    description: dish.description,
    image: dish.image,
    menuAddOn: dish.category,
    offers: {
      "@type": "Offer",
      price: dish.price,
      priceCurrency: "ETB",
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <article>
      <div style={{ marginBottom: "1rem" }}>
        <Link href="/menu" className="btn-ghost" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
          Back to Menu
        </Link>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="dish-card__image-wrap">
        <DishImage dish={dish} size="hero" priority={true} />
        <FavoriteButton dish={dish} size="hero" />
      </div>
      <h1>{dish.name}</h1>
      <p className="dish-category">{dish.category}</p>
      <p>{dish.description}</p>
      <p className="dish-price">{dish.price} ETB</p>
      <div style={{ marginTop: "1.5rem", display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        <AddToCartButton dish={dish} />
        <Link href="/menu" className="btn-ghost">
          Back to Menu
        </Link>
      </div>
    </article>
  );
}
