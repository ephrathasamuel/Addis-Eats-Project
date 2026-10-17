// Dishes data store with Traditional Ethiopian cuisine, Western cuisine, and Beverages.
// Uses local high-resolution photography in /images/food for instant, reliable loading.
// Stored in globalThis.__addis_dishes to support admin actions (Sold Out, Remove, Restore) across requests.

const INITIAL_DISHES = [
  // --- Traditional Ethiopian Cuisine ---
  {
    id: "doro-wat",
    name: "Doro Wat",
    category: "Traditional",
    price: 360,
    spicy: true,
    tag: "National Favorite",
    description: "Slow-simmered tender chicken in rich berbere sauce with hard-boiled egg and fresh injera.",
    image: "/images/food/doro-wat.jpg",
    color: "#7c5cff",
    isSoldOut: false,
    isRemoved: false,
    ordersCount: 142,
    rating: 4.9,
    reviewsCount: 88,
    reviewHighlight: "Rich, authentic berbere flavor and perfectly tender chicken.",
  },
  {
    id: "kitfo",
    name: "Special Kitfo",
    category: "Traditional",
    price: 390,
    spicy: true,
    tag: "Chef Special",
    description: "Hand-minced prime lean beef infused with spiced niter kibbeh and mitmita, served with ayib and gomen.",
    image: "/images/food/kitfo.jpg",
    color: "#5b3fd1",
    isSoldOut: false,
    isRemoved: false,
    ordersCount: 118,
    rating: 4.8,
    reviewsCount: 72,
    reviewHighlight: "The spiced herbal butter and fresh ayib are simply incredible.",
  },
  {
    id: "tibs",
    name: "Shekla Tibs",
    category: "Traditional",
    price: 340,
    spicy: false,
    tag: "Sizzling Hot",
    description: "Tender sauteed beef cubes tossed with red onions, fresh garlic, rosemary, and jalapeno peppers.",
    image: "/images/food/shekla-tibs.jpg",
    color: "#5b3fd1",
    isSoldOut: false,
    isRemoved: false,
    ordersCount: 96,
    rating: 4.9,
    reviewsCount: 64,
    reviewHighlight: "Arrives piping hot with delicious char and fresh rosemary aroma.",
  },
  {
    id: "shiro",
    name: "Shiro Tegabino",
    category: "Traditional",
    price: 240,
    spicy: false,
    tag: "Clay Pot",
    description: "Bubbling seasoned chickpea stew enriched with garlic, ginger, and spiced herbal butter.",
    image: "/images/food/shiro.jpg",
    color: "#7c5cff",
    isSoldOut: false,
    isRemoved: false,
    ordersCount: 85,
    rating: 4.8,
    reviewsCount: 47,
    reviewHighlight: "Silky texture and traditional clay pot aroma. True comfort food.",
  },
  {
    id: "beyaynetu",
    name: "Beyaynetu Platter",
    category: "Traditional",
    price: 280,
    spicy: false,
    tag: "Vegan Feast",
    description: "Colorful assortment of Misir Wat, Kik Alicha, braised Gomen, and beetroot salad over fresh teff injera.",
    image: "/images/food/beyaynetu.jpg",
    color: "#7c5cff",
    isSoldOut: false,
    isRemoved: false,
    ordersCount: 74,
    rating: 4.7,
    reviewsCount: 39,
    reviewHighlight: "Generous portions and vibrant array of lentil and vegetable stews.",
  },
  {
    id: "firfir",
    name: "Kuanta Firfir",
    category: "Traditional",
    price: 290,
    spicy: true,
    tag: "Authentic",
    description: "Cured dried beef jerky simmered in spicy berbere broth and folded with torn rolls of injera.",
    image: "/images/food/firfir.jpg",
    color: "#5b3fd1",
    isSoldOut: false,
    isRemoved: false,
    ordersCount: 61,
    rating: 4.8,
    reviewsCount: 33,
    reviewHighlight: "Bold savory berbere kick with tender cured beef jerky pieces.",
  },
  {
    id: "gomen-wat",
    name: "Gomen Wat with Ayib",
    category: "Traditional",
    price: 220,
    spicy: false,
    tag: "Vegetarian",
    description: "Tender collard greens slow-braised with Ethiopian herbal butter, minced garlic, ginger, and mild green peppers, topped with fresh homemade Ayib cottage cheese.",
    image: "/images/food/gomen-wat.jpg",
    color: "#27ae60",
    isSoldOut: false,
    isRemoved: false,
    ordersCount: 68,
    rating: 4.8,
    reviewsCount: 41,
    reviewHighlight: "Fresh, savory collard greens balanced perfectly with cool, creamy Ayib.",
  },
  {
    id: "kik-alicha",
    name: "Kik Alicha Stew",
    category: "Traditional",
    price: 210,
    spicy: false,
    tag: "Mild Comfort",
    description: "Golden split peas simmered to velvety softness in a mild turmeric, garlic, and sweet onion broth, served with warm teff injera.",
    image: "/images/food/kik-alicha.jpg",
    color: "#f39c12",
    isSoldOut: false,
    isRemoved: false,
    ordersCount: 59,
    rating: 4.7,
    reviewsCount: 36,
    reviewHighlight: "Mild and soul-warming turmeric stew with rich comforting flavor.",
  },
  {
    id: "derek-tibs",
    name: "Crispy Derek Tibs",
    category: "Traditional",
    price: 370,
    spicy: true,
    tag: "Sizzling Crispy",
    description: "Pan-crisped lean beef cubes flash-fried with fresh rosemary sprigs, garlic, sliced jalapenos, and a side of hot awaze dipping sauce.",
    image: "/images/food/derek-tibs.jpg",
    color: "#c0392b",
    isSoldOut: false,
    isRemoved: false,
    ordersCount: 92,
    rating: 4.9,
    reviewsCount: 63,
    reviewHighlight: "Crispy caramelized beef exterior with juicy tenderness inside. Excellent with awaze!",
  },
  {
    id: "bozena-shiro",
    name: "Clay Pot Bozena Shiro",
    category: "Traditional",
    price: 290,
    spicy: true,
    tag: "Hearty Stew",
    description: "Sun-dried chickpea flour stew enriched with seasoned minced prime beef, spiced butter, and garlic, bubbling hot in a clay pot.",
    image: "/images/food/shiro.jpg",
    color: "#d35400",
    isSoldOut: false,
    isRemoved: false,
    ordersCount: 77,
    rating: 4.8,
    reviewsCount: 49,
    reviewHighlight: "The seasoned minced beef elevates traditional shiro to another level.",
  },

  // --- Western Cuisine ---
  {
    id: "cheeseburger",
    name: "Gourmet Cheeseburger",
    category: "Western",
    price: 350,
    spicy: false,
    tag: "Handcrafted",
    description: "Prime beef patty, melted cheddar, crisp lettuce, ripe tomato, and house special sauce on a brioche bun with fries.",
    image: "/images/food/cheeseburger.jpg",
    color: "#e67e22",
    isSoldOut: false,
    isRemoved: false,
    ordersCount: 78,
    rating: 4.6,
    reviewsCount: 42,
    reviewHighlight: "Juicy burger with golden crispy seasoned fries on the side.",
  },
  {
    id: "margherita-pizza",
    name: "Wood-Fired Pizza",
    category: "Western",
    price: 380,
    spicy: false,
    tag: "Artisanal",
    description: "Crispy thin crust baked with San Marzano tomato sauce, fresh buffalo mozzarella, olive oil, and sweet basil.",
    image: "/images/food/margherita-pizza.jpg",
    color: "#e74c3c",
    isSoldOut: false,
    isRemoved: false,
    ordersCount: 88,
    rating: 4.7,
    reviewsCount: 51,
    reviewHighlight: "Stone baked crust with airy charred bubbles and rich cheese.",
  },
  {
    id: "chicken-alfredo",
    name: "Creamy Chicken Alfredo",
    category: "Western",
    price: 360,
    spicy: false,
    tag: "Italian Classic",
    description: "Al dente fettuccine pasta in rich garlic parmesan cream sauce, topped with grilled chicken breast slices.",
    image: "/images/food/chicken-alfredo.jpg",
    color: "#f39c12",
    isSoldOut: false,
    isRemoved: false,
    ordersCount: 52,
    rating: 4.5,
    reviewsCount: 29,
    reviewHighlight: "Velvety cream sauce and well-seasoned grilled chicken.",
  },
  {
    id: "club-sandwich",
    name: "Classic Club Sandwich",
    category: "Western",
    price: 310,
    spicy: false,
    tag: "Triple Decker",
    description: "Toasted farmhouse bread layered with roasted chicken, crisp beef bacon, cheddar, avocado, and herb mayo with fries.",
    image: "/images/food/club-sandwich.jpg",
    color: "#e67e22",
    isSoldOut: false,
    isRemoved: false,
    ordersCount: 46,
    rating: 4.6,
    reviewsCount: 24,
    reviewHighlight: "Crispy toasted bread and generous fresh layers.",
  },
  {
    id: "ribeye-steak",
    name: "Grilled Ribeye Steak",
    category: "Western",
    price: 490,
    spicy: false,
    tag: "Premium Cut",
    description: "Juicy char-grilled 250g ribeye steak topped with garlic herb butter, served with mashed potatoes and charred vegetables.",
    image: "/images/food/ribeye-steak.jpg",
    color: "#c0392b",
    isSoldOut: false,
    isRemoved: false,
    ordersCount: 65,
    rating: 4.8,
    reviewsCount: 38,
    reviewHighlight: "Tender and flavorful steak cooked to a perfect medium.",
  },
  {
    id: "crispy-fried-chicken",
    name: "Addis Crispy Fried Chicken",
    category: "Western",
    price: 330,
    spicy: false,
    tag: "Golden Crunch",
    description: "Crispy buttermilk-brined chicken fillets fried to a golden crunch, served with seasoned potato wedges and honey garlic dipping glaze.",
    image: "/images/food/cheeseburger.jpg",
    color: "#e67e22",
    isSoldOut: false,
    isRemoved: false,
    ordersCount: 83,
    rating: 4.7,
    reviewsCount: 52,
    reviewHighlight: "Super crunchy on the outside, juicy on the inside, with fantastic seasoning.",
  },
  {
    id: "penne-arrabbiata",
    name: "Spicy Penne Arrabbiata",
    category: "Western",
    price: 295,
    spicy: true,
    tag: "Fiery Pasta",
    description: "Penne rigate pasta tossed in a fiery San Marzano tomato sauce infused with garlic, crushed red chilies, extra virgin olive oil, and fresh basil.",
    image: "/images/food/chicken-alfredo.jpg",
    color: "#e74c3c",
    isSoldOut: false,
    isRemoved: false,
    ordersCount: 64,
    rating: 4.6,
    reviewsCount: 38,
    reviewHighlight: "Zesty tomato sauce with a genuine chili kick and perfectly cooked pasta.",
  },

  // --- Beverages & Desserts ---
  {
    id: "buna",
    name: "Traditional Buna Ceremony",
    category: "Drinks",
    price: 80,
    spicy: false,
    tag: "Jebena Brew",
    description: "Freshly roasted highland Ethiopian coffee beans brewed in a traditional clay jebena, served with fresh popcorn.",
    image: "/images/food/buna-ceremony.jpg",
    color: "#8e44ad",
    isSoldOut: false,
    isRemoved: false,
    ordersCount: 110,
    rating: 4.9,
    reviewsCount: 76,
    reviewHighlight: "Authentic clay jebena brew with unmatched fragrance and fresh popcorn.",
  },
  {
    id: "spiced-chai",
    name: "Ethiopian Spiced Chai (Shai)",
    category: "Drinks",
    price: 65,
    spicy: false,
    tag: "Highland Spices",
    description: "Steaming highland black tea simmered with cracked cinnamon bark, fragrant cardamom pods, cloves, and fresh ginger root.",
    image: "/images/food/spiced-chai.jpg",
    color: "#9b59b6",
    isSoldOut: false,
    isRemoved: false,
    ordersCount: 95,
    rating: 4.9,
    reviewsCount: 58,
    reviewHighlight: "Deeply aromatic and soothing with warm cinnamon and cardamom notes.",
  },
  {
    id: "tej",
    name: "Pure Honey Tej",
    category: "Drinks",
    price: 160,
    spicy: false,
    tag: "Highland Mead",
    description: "Fermented honey wine made from raw highland wild honey and gesho leaves, served in a traditional glass berele flask.",
    image: "/images/food/tej.jpg",
    color: "#f1c40f",
    isSoldOut: false,
    isRemoved: false,
    ordersCount: 57,
    rating: 4.7,
    reviewsCount: 31,
    reviewHighlight: "Golden smooth mead with natural highland honey sweetness.",
  },
  {
    id: "spris-juice",
    name: "Fresh Spris Juice",
    category: "Drinks",
    price: 120,
    spicy: false,
    tag: "100% Fresh",
    description: "Vibrant layered tropical fruit smoothie with pureed fresh avocado, sweet mango, and papaya with fresh lime.",
    image: "/images/food/spris-juice.jpg",
    color: "#27ae60",
    isSoldOut: false,
    isRemoved: false,
    ordersCount: 84,
    rating: 4.8,
    reviewsCount: 54,
    reviewHighlight: "Thick, refreshing layers of real avocado and mango.",
  },
  {
    id: "mango-passion",
    name: "Fresh Mango Passion Juice",
    category: "Drinks",
    price: 130,
    spicy: false,
    tag: "100% Tropical",
    description: "Sweet sun-ripened Harar mango puree swirled with tangy passion fruit pulp and crushed ice for the ultimate tropical refresher.",
    image: "/images/food/mango-passion.jpg",
    color: "#f39c12",
    isSoldOut: false,
    isRemoved: false,
    ordersCount: 88,
    rating: 4.8,
    reviewsCount: 47,
    reviewHighlight: "Thick and naturally sweet with a delightful tangy passion fruit swirl.",
  },
  {
    id: "besso-smoothie",
    name: "Besso Highland Barley Shake",
    category: "Drinks",
    price: 95,
    spicy: false,
    tag: "Heritage Drink",
    description: "Roasted whole Ethiopian barley flour blended with chilled mountain spring water, raw wild honey, and a pinch of ground cinnamon.",
    image: "/images/food/besso-smoothie.jpg",
    color: "#d35400",
    isSoldOut: false,
    isRemoved: false,
    ordersCount: 71,
    rating: 4.7,
    reviewsCount: 39,
    reviewHighlight: "Earthy, nutty, and nourishing traditional Ethiopian energy drink.",
  },
  {
    id: "avocado-smoothie",
    name: "Creamy Avocado Lime Shake",
    category: "Drinks",
    price: 125,
    spicy: false,
    tag: "Silky & Rich",
    description: "Whipped fresh ripe avocado blended with a squeeze of fresh lime juice and sweetened with pure highland honey.",
    image: "/images/food/spris-juice.jpg",
    color: "#27ae60",
    isSoldOut: false,
    isRemoved: false,
    ordersCount: 79,
    rating: 4.8,
    reviewsCount: 43,
    reviewHighlight: "Incredibly smooth and creamy with the perfect citrus balance.",
  },
  {
    id: "hibiscus-iced-tea",
    name: "Karkadeh Hibiscus Iced Tea",
    category: "Drinks",
    price: 85,
    spicy: false,
    tag: "Chilled & Tangy",
    description: "Ruby-red chilled infusion of dried hibiscus flowers with fresh mint leaves and a touch of raw sugar syrup over crushed ice.",
    image: "/images/food/tej.jpg",
    color: "#c0392b",
    isSoldOut: false,
    isRemoved: false,
    ordersCount: 66,
    rating: 4.7,
    reviewsCount: 32,
    reviewHighlight: "Vibrant ruby color, crisp tart flavor, and deeply refreshing.",
  },
  {
    id: "mineral-water",
    name: "Ambo Sparkling Mineral Water",
    category: "Drinks",
    price: 50,
    spicy: false,
    tag: "Natural Sparkle",
    description: "Ethiopia's legendary naturally carbonated mineral spring water from the thermal volcanic springs of Ambo, served ice-cold with a lemon wedge.",
    image: "/images/food/buna-ceremony.jpg",
    color: "#3498db",
    isSoldOut: false,
    isRemoved: false,
    ordersCount: 114,
    rating: 4.9,
    reviewsCount: 70,
    reviewHighlight: "Crisp, effervescent, and clean. The classic Ethiopian dining companion.",
  },
];

// Persistent global singleton
if (!globalThis.__addis_dishes) {
  globalThis.__addis_dishes = INITIAL_DISHES.map((d) => ({ ...d }));
} else {
  const existingIds = new Set(globalThis.__addis_dishes.map((d) => d.id));
  for (const dish of INITIAL_DISHES) {
    if (!existingIds.has(dish.id)) {
      globalThis.__addis_dishes.push({ ...dish });
    }
  }
}

function getStore() {
  return globalThis.__addis_dishes;
}

export const HERO_IMAGE = "/images/food/hero-feast.jpg";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Customer-facing dish query: excludes removed dishes.
 */
export async function getDishes(category) {
  await delay(80);
  const dishes = getStore().filter((d) => !d.isRemoved);
  if (category) {
    return dishes.filter((d) => d.category.toLowerCase() === category.toLowerCase());
  }
  return dishes;
}

/**
 * Admin dish query: returns all dishes including removed and sold out items.
 */
export function getAllDishesAdmin() {
  return getStore();
}

/**
 * Admin action: toggle Sold Out status
 */
export function toggleDishSoldOut(id) {
  const dish = getStore().find((d) => d.id === id);
  if (dish) {
    dish.isSoldOut = !dish.isSoldOut;
    return dish;
  }
  return null;
}

/**
 * Admin action: Remove / Archive a dish from the menu
 */
export function removeDish(id) {
  const dish = getStore().find((d) => d.id === id);
  if (dish) {
    dish.isRemoved = true;
    return dish;
  }
  return null;
}

/**
 * Admin action: Restore a previously removed dish
 */
export function restoreDish(id) {
  const dish = getStore().find((d) => d.id === id);
  if (dish) {
    dish.isRemoved = false;
    dish.isSoldOut = false;
    return dish;
  }
  return null;
}

/**
 * Admin action: Add a new dish to the menu
 */
export function addDish({ name, category = "Traditional", price = 250, spicy = false, tag = "Chef's Special", description = "", image = "/images/food/doro-wat.jpg" }) {
  const store = getStore();
  const slug = (name || "dish")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const id = `${slug || "dish"}-${Date.now().toString().slice(-4)}`;

  const newDish = {
    id,
    name: name.trim(),
    category: category.trim() || "Traditional",
    price: Number(price) || 200,
    spicy: Boolean(spicy),
    tag: tag.trim() || "New Specialty",
    description: description.trim() || "Freshly cooked specialty prepared with authentic ingredients.",
    image: image || "/images/food/hero-feast.jpg",
    color: "#e67e22",
    isSoldOut: false,
    isRemoved: false,
    ordersCount: 0,
    rating: 5.0,
    reviewsCount: 1,
    reviewHighlight: "Newly added specialty dish!",
  };

  store.unshift(newDish);
  return newDish;
}

/**
 * Admin favorites: Most ordered and top-reviewed dishes
 */
export function getAdminFavorites() {
  return [...getStore()]
    .filter((d) => !d.isRemoved)
    .sort((a, b) => b.ordersCount - a.ordersCount);
}

export async function getDishById(id) {
  await delay(50);
  return getDishByIdSync(id);
}

export function getDishByIdSync(id) {
  if (!id) return null;
  const key = String(id).toLowerCase().trim();
  const strippedKey = key.replace(/[-_\s]/g, "");
  return (
    getStore().find((d) => {
      const dId = d.id.toLowerCase();
      const dName = d.name.toLowerCase();
      return (
        dId === key ||
        dName === key ||
        dId.replace(/[-_\s]/g, "") === strippedKey ||
        dName.replace(/[-_\s]/g, "") === strippedKey ||
        key.includes(dId) ||
        dId.includes(key) ||
        key.includes(dName) ||
        dName.includes(key)
      );
    }) ?? null
  );
}

export function getDishByNameSync(name) {
  if (!name) return null;
  return getDishByIdSync(name);
}

export function getAllDishIds() {
  return getStore().map((d) => d.id);
}

export function getCategories() {
  return [...new Set(getStore().filter((d) => !d.isRemoved).map((d) => d.category))];
}

/**
 * Admin action: Update / Edit existing dish details
 */
export function updateDish({ id, name, category, price, spicy, tag, description, image }) {
  const dish = getStore().find((d) => d.id === id);
  if (!dish) return null;
  if (name !== undefined && name.trim()) dish.name = name.trim();
  if (category !== undefined && category.trim()) dish.category = category.trim();
  if (price !== undefined && !isNaN(Number(price))) dish.price = Number(price);
  if (spicy !== undefined) dish.spicy = Boolean(spicy);
  if (tag !== undefined) dish.tag = tag.trim();
  if (description !== undefined) dish.description = description.trim();
  if (image !== undefined && image.trim()) dish.image = image.trim();
  return dish;
}

/**
 * Customer action: Add a review and star rating to a dish
 */
export function addDishReview(dishIdOrName, rating, reviewText) {
  const dish = getDishByIdSync(dishIdOrName) || getDishByNameSync(dishIdOrName);
  if (!dish) return null;
  const numRating = Number(rating) || 5;
  const prevReviewsCount = dish.reviewsCount || 1;
  const prevRating = dish.rating || 4.8;
  const newReviewsCount = prevReviewsCount + 1;
  const newRating = Number(((prevRating * prevReviewsCount + numRating) / newReviewsCount).toFixed(1));
  dish.reviewsCount = newReviewsCount;
  dish.rating = newRating;
  if (reviewText && reviewText.trim()) {
    dish.reviewHighlight = reviewText.trim();
  }
  return dish;
}
