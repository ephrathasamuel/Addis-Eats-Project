import Link from "next/link";
import Image from "next/image";
import { getDishes, HERO_IMAGE } from "@/lib/dishes";
import { DishCard } from "@/components/DishCard";

export const metadata = {
  title: "Home : Authentic Ethiopian & Western Cuisine",
  description: "Order slow-simmered Doro Wat, sizzling Tibs, artisanal pizzas, and gourmet burgers delivered hot across Addis Ababa.",
};

export default async function HomePage() {
  const dishes = await getDishes();
  const traditional = dishes.filter((d) => d.category === "Traditional").slice(0, 4);
  const western = dishes.filter((d) => d.category === "Western").slice(0, 4);
  const drinks = dishes.filter((d) => d.category === "Drinks").slice(0, 4);

  const restaurantJsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: "Addis Eats",
    image: HERO_IMAGE,
    description: "Authentic Ethiopian and Western food delivery in Addis Ababa.",
    servesCuisine: ["Ethiopian", "Western"],
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Addis Ababa",
      addressCountry: "ET",
    },
  };

  return (
    <div className="home-page-container">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurantJsonLd) }}
      />

      {/* Hero Banner Section */}
      <section className="hero-banner">
        <Image
          src={HERO_IMAGE}
          alt="Authentic feast spread with Ethiopian stews and fresh dishes"
          fill
          priority
          sizes="100vw"
          className="hero-banner__image"
          style={{ objectFit: "cover" }}
        />
        <div className="hero-banner__scrim" />

        <div className="hero-banner__content">
          <div className="hero-banner__pill">
            <span className="pill-star" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </span>
            <span>Addis Ababa Premier Kitchen : Authentic & Artisanal</span>
          </div>

          <h1 className="hero-banner__title">
            Savor the True Flavors of Ethiopia & Western Classics
          </h1>

          <p className="hero-banner__desc">
            Slow-cooked clay-pot Doro Wat, sizzling Shekla Tibs, wood-fired pizzas, and gourmet burgers. Delivered steaming hot to your doorstep in 35 to 45 minutes.
          </p>

          <div className="hero-banner__actions">
            <Link href="/menu" className="btn-primary hero-btn">
              All Dishes
            </Link>
            <Link href="/menu?category=Traditional" className="btn-secondary hero-btn hero-btn--outline">
              Traditional
            </Link>
            <Link href="/menu?category=Western" className="btn-secondary hero-btn hero-btn--outline">
              Western
            </Link>
            <Link href="/menu?category=Drinks" className="btn-secondary hero-btn hero-btn--outline">
              Drinks
            </Link>
          </div>
        </div>
      </section>

      {/* Value Proposition Strip */}
      <section className="value-strip" aria-label="Why choose Addis Eats">
        <Link href="/track" className="value-item" style={{ textDecoration: "none", color: "inherit" }}>
          <span className="value-item__icon" aria-hidden="true" style={{ color: "var(--brand)" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
              <line x1="9" y1="3" x2="9" y2="18" />
              <line x1="15" y1="6" x2="15" y2="21" />
            </svg>
          </span>
          <div>
            <strong>Live Courier GPS Tracking</strong>
            <p>Real-time OpenStreetMap across Bole, Kazanchis, Piassa &amp; Sarbet</p>
          </div>
        </Link>
        <div className="value-item">
          <span className="value-item__icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
              <line x1="6" y1="1" x2="6" y2="4" />
              <line x1="10" y1="1" x2="10" y2="4" />
              <line x1="14" y1="1" x2="14" y2="4" />
            </svg>
          </span>
          <div>
            <strong>Clay Pot & Wood-Fired</strong>
            <p>Traditional heritage recipes and stone-baked pizzas</p>
          </div>
        </div>
        <div className="value-item">
          <span className="value-item__icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" />
            </svg>
          </span>
          <div>
            <strong>Easy Digital Payment</strong>
            <p>Instant TeleBirr | CBE Birr | Cash on Delivery</p>
          </div>
        </div>
      </section>

      {/* Quick Category Navigation Strip */}
      <nav className="category-bar category-bar--home" aria-label="Browse categories">
        <Link href="/menu" className="category active">
          All
        </Link>
        <Link href="/menu?category=Traditional" className="category">
          Traditional
        </Link>
        <Link href="/menu?category=Western" className="category">
          Western
        </Link>
        <Link href="/menu?category=Drinks" className="category">
          Drinks
        </Link>
      </nav>

      {/* Traditional Ethiopian Cuisine Showcase */}
      <section className="home-section">
        <div className="home-section__header">
          <div className="home-section__title-group">
            <span className="section-eyebrow">Heritage Cooking</span>
            <h2>Traditional Ethiopian Specialties</h2>
          </div>
          <Link
            href="/menu?category=Traditional"
            className="section-more-link"
            aria-label="See all traditional Ethiopian specialties"
          >
            <span>See all</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14" />
              <path d="M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
        <div className="dish-grid">
          {traditional.map((dish) => (
            <DishCard key={dish.id} dish={dish} />
          ))}
        </div>
      </section>

      {/* Western Cuisine Showcase */}
      <section className="home-section">
        <div className="home-section__header">
          <div className="home-section__title-group">
            <span className="section-eyebrow">Artisanal & Modern</span>
            <h2>Western Kitchen Favorites</h2>
          </div>
          <Link
            href="/menu?category=Western"
            className="section-more-link"
            aria-label="See all western kitchen favorites"
          >
            <span>See all</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14" />
              <path d="M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
        <div className="dish-grid">
          {western.map((dish) => (
            <DishCard key={dish.id} dish={dish} />
          ))}
        </div>
      </section>

      {/* Traditional Buna Ceremony & Refreshing Beverages */}
      <section className="home-section">
        <div className="home-section__header">
          <div className="home-section__title-group">
            <span className="section-eyebrow">Ceremonial & Cold</span>
            <h2>Coffee Ceremony & Beverages</h2>
          </div>
          <Link
            href="/menu?category=Drinks"
            className="section-more-link"
            aria-label="See all coffee ceremony and beverages"
          >
            <span>See all</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14" />
              <path d="M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
        <div className="dish-grid">
          {drinks.map((dish) => (
            <DishCard key={dish.id} dish={dish} />
          ))}
        </div>
      </section>
    </div>
  );
}
