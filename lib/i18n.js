// Amharic for the customer-facing screens. Safe in browser and server code.
//
// t(lang, "English text") returns the Amharic translation when the visitor
// chose Amharic and one exists, otherwise the English text unchanged, so a
// missing translation can never blank out the page. Placeholders like {total}
// are filled from the third argument.
//
// The Amharic below is a first draft: have a native speaker review it.

export const LANGUAGES = { en: "English", am: "አማርኛ" };
export const LANG_COOKIE = "addis_lang";

const AM = {
  // Header, navigation, footer
  Menu: "ምግብ ዝርዝር",
  Orders: "ትዕዛዞች",
  Favorites: "ተወዳጆች",
  Cart: "ጋሪ",
  "Live Map": "የቀጥታ ካርታ",
  "Sign in": "ግባ",
  "Sign out": "ውጣ",
  Profile: "መገለጫ",
  "Your profile": "መገለጫዎ",
  "Skip to content": "ወደ ይዘቱ ዝለል",
  "Contact us": "ያግኙን",
  "Call us": "ይደውሉልን",
  "Email us": "ኢሜይል ይላኩልን",
  Explore: "ያስሱ",
  Legal: "ሕጋዊ",
  "Privacy policy": "የግላዊነት መመሪያ",
  "Terms of service": "የአገልግሎት ውሎች",
  "Live Courier Map": "የመልእክተኛ የቀጥታ ካርታ",
  "Order History": "የትዕዛዝ ታሪክ",
  "Ethiopian food, cooked slow and ordered online.": "በዝግታ የበሰለ የኢትዮጵያ ምግብ፣ በኦንላይን የሚታዘዝ።",
  "All rights reserved.": "መብቱ በሕግ የተጠበቀ ነው።",
  Language: "ቋንቋ",

  // Home
  "Savor the True Flavors of Ethiopia & Western Classics": "እውነተኛውን የኢትዮጵያ ጣዕም እና የምዕራባውያን ምግቦችን ይቅመሱ",
  "Slow-cooked clay-pot Doro Wat, sizzling Shekla Tibs, wood-fired pizzas, and gourmet burgers. Delivered hot to your door, with a live time estimate before you order.":
    "በሸክላ ድስት በዝግታ የበሰለ ዶሮ ወጥ፣ የሚንጣጣ ሸክላ ጥብስ፣ በእንጨት የተጋገረ ፒዛ እና በርገር። ትኩስ ሆኖ ቤትዎ ድረስ ይደርሳል፤ ከማዘዝዎ በፊት የሚደርስበትን ጊዜ ያያሉ።",
  "Order Now": "አሁን ይዘዙ",
  "All Dishes": "ሁሉም ምግቦች",
  "Addis Ababa Premier Kitchen : Authentic & Artisanal": "የአዲስ አበባ ምርጥ ማዕድ ቤት፦ እውነተኛ እና በእጅ የተሰራ",
  "Live Courier GPS Tracking": "የመልእክተኛ የቀጥታ ጂፒኤስ ክትትል",
  "Real-time OpenStreetMap across Bole, Kazanchis, Piassa & Sarbet": "በቦሌ፣ ካዛንቺስ፣ ፒያሳ እና ሳርቤት የቀጥታ ካርታ",
  "Clay Pot & Wood-Fired": "በሸክላ ድስት እና በእንጨት እሳት",
  "Traditional heritage recipes and stone-baked pizzas": "ባህላዊ የቤት አሰራሮች እና በድንጋይ ምድጃ የተጋገሩ ፒዛዎች",
  "Heritage Cooking": "ባህላዊ አሰራር",
  "Traditional Ethiopian Specialties": "ልዩ ባህላዊ የኢትዮጵያ ምግቦች",
  "See all": "ሁሉንም ይመልከቱ",
  "Artisanal & Modern": "በእጅ የተሰራ እና ዘመናዊ",
  "Western Kitchen Favorites": "ተወዳጅ የምዕራባውያን ምግቦች",
  "Ceremonial & Cold": "የቡና ሥነ ሥርዓት እና ቀዝቃዛ መጠጦች",
  "Coffee Ceremony & Beverages": "የቡና ሥነ ሥርዓት እና መጠጦች",
  "View Menu": "ምግብ ዝርዝሩን ይመልከቱ",
  "Cash on Delivery": "ሲደርስ በጥሬ ገንዘብ",
  "Pay the courier when your food arrives": "ምግብዎ ሲደርስ ለመልእክተኛው ይክፈሉ",

  // Menu and dishes
  "Search dishes": "ምግብ ይፈልጉ",
  All: "ሁሉም",
  Traditional: "ባህላዊ",
  Western: "ምዕራባዊ",
  Drinks: "መጠጦች",
  Breakfast: "ቁርስ",
  Dessert: "ጣፋጭ",
  "Add to cart": "ወደ ጋሪ ጨምር",
  Added: "ተጨምሯል",
  "Sold out": "ተሽጧል",
  Spicy: "ቅመም ያለው",
  "Our Menu": "የምግብ ዝርዝራችን",

  // Cart
  "Your cart": "ጋሪዎ",
  "Your Cart": "ጋሪዎ",
  "Your cart is empty": "ጋሪዎ ባዶ ነው",
  "Proceed to Checkout": "ወደ ክፍያ ይቀጥሉ",
  Remove: "አስወግድ",
  Subtotal: "ንዑስ ድምር",
  Total: "ጠቅላላ",
  "Browse the menu": "ምግብ ዝርዝሩን ያስሱ",
  "Browse Menu": "ምግብ ዝርዝሩን ያስሱ",
  "Back to Menu": "ወደ ምግብ ዝርዝሩ ተመለስ",
  "Explore our Traditional Ethiopian stews or Western favorites to get started.": "ለመጀመር ባህላዊ የኢትዮጵያ ወጦቻችንን ወይም የምዕራባውያን ተወዳጅ ምግቦችን ያስሱ።",
  "Review your selected dishes | Adjust portions | Delivery fee depends on your neighborhood": "የመረጧቸውን ምግቦች ይገምግሙ | መጠኑን ያስተካክሉ | የማድረሻ ክፍያው እንደ ሰፈርዎ ይለያያል",
  "Order Summary": "የትዕዛዝ ማጠቃለያ",
  "Items Subtotal": "የምግቦች ንዑስ ድምር",
  "Delivery Fee": "የማድረሻ ክፍያ",
  "(by distance, shown at checkout)": "(እንደ ርቀቱ፣ ሲያጠናቅቁ ይታያል)",
  "From 115 ETB": "ከ115 ብር ጀምሮ",
  "Food total": "የምግብ ድምር",

  // Checkout
  "Order Checkout": "ትዕዛዝ ማጠናቀቂያ",
  "Delivery Details": "የማድረሻ ዝርዝሮች",
  "Full Name": "ሙሉ ስም",
  "Phone number": "ስልክ ቁጥር",
  "Delivery Neighborhood": "የማድረሻ ሰፈር",
  "Your Neighborhood / Landmark": "ሰፈርዎ / ምልክት",
  "Directions for the courier (optional)": "ለመልእክተኛው አቅጣጫ (አማራጭ)",
  "Attach your exact location": "ትክክለኛ ቦታዎን ያያይዙ",
  "Total (Food + Delivery):": "ጠቅላላ (ምግብ + ማድረሻ)፦",
  "Place order ({total} ETB)": "ይዘዙ ({total} ብር)",
  "Placing your order…": "ትዕዛዝዎ እየተላከ ነው…",
  "Pay {total} ETB now": "{total} ብር አሁን ይክፈሉ",
  "Opening payment…": "ክፍያ እየተከፈተ ነው…",
  "How would you like to pay?": "እንዴት መክፈል ይፈልጋሉ?",
  "Cash on delivery": "ሲደርስ በጥሬ ገንዘብ",
  "Pay the courier when your food arrives.": "ምግብዎ ሲደርስ ለመልእክተኛው ይክፈሉ።",
  "Pay now": "አሁን ይክፈሉ",
  "telebirr, CBE Birr or card, through Chapa.": "በቴሌብር፣ በሲቢኢ ብር ወይም በካርድ፣ በቻፓ በኩል።",
  Payment: "ክፍያ",
  "Cash on delivery: pay the courier when your order arrives.": "ሲደርስ በጥሬ ገንዘብ፦ ትዕዛዝዎ ሲደርስ ለመልእክተኛው ይክፈሉ።",
  "We're closed": "ዝግ ነን",
  "Orders are paused": "ትዕዛዝ ለጊዜው ቆሟል",

  // Confirmation and order status
  "Order Placed Successfully": "ትዕዛዝዎ በተሳካ ሁኔታ ተልኳል",
  "Order Number": "የትዕዛዝ ቁጥር",
  "Total Amount": "ጠቅላላ መጠን",
  "Paid online": "በኦንላይን ተከፍሏል",
  "Order Placed": "ትዕዛዝ ተቀብለናል",
  "Cooking in Kitchen": "በኩሽና እየበሰለ ነው",
  "Ready, Waiting for a Courier": "ዝግጁ ነው፣ መልእክተኛ እየጠበቀ ነው",
  "Courier Picking Up Your Food": "መልእክተኛው ምግብዎን እየወሰደ ነው",
  "Courier On The Way": "መልእክተኛው በመንገድ ላይ ነው",
  Delivered: "ደርሷል",
  Cancelled: "ተሰርዟል",
  "Waiting for Payment": "ክፍያ እየጠበቀ ነው",
  "Current status": "አሁን ያለበት ሁኔታ",
  "Your delivery code": "የማድረሻ ኮድዎ",
  "Tell this code to your courier when your food arrives. Don't share it before then.":
    "ምግብዎ ሲደርስ ይህን ኮድ ለመልእክተኛው ይንገሩ። ከዚያ በፊት ለማንም አያጋሩ።",
  "Your courier": "መልእክተኛዎ",
  "Delivered by": "ያደረሰው",
  "Back to order history": "ወደ ትዕዛዝ ታሪክ ተመለስ",
  "Back to profile": "ወደ መገለጫ ተመለስ",
  "Something wrong with this order?": "በዚህ ትዕዛዝ ላይ ችግር አለ?",
  "This order isn't paid yet": "ይህ ትዕዛዝ ገና አልተከፈለም",
  "Finish payment": "ክፍያውን ያጠናቅቁ",

  // Sign in
  Email: "ኢሜይል",
  Password: "የይለፍ ቃል",
  "Create an account": "መለያ ይፍጠሩ",
  "Forgot password?": "የይለፍ ቃል ረሱ?",
  "Continue with Google": "በጉግል ይቀጥሉ",
};

const DICTIONARIES = { am: AM };

export function normalizeLang(value) {
  return value === "am" ? "am" : "en";
}

export function t(lang, text, values) {
  const translated = (lang === "am" && DICTIONARIES.am[text]) || text;
  if (!values) return translated;
  return translated.replace(/\{(\w+)\}/g, (match, key) => (key in values ? String(values[key]) : match));
}
