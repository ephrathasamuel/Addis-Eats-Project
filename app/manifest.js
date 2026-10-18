// Lets phones install Addis Eats to the home screen (needed for notifications on iPhone).
export default function manifest() {
  return {
    name: "Addis Eats",
    short_name: "Addis Eats",
    description: "Ethiopian food, ordered online.",
    start_url: "/menu",
    display: "standalone",
    background_color: "#0b0b0f",
    theme_color: "#7c5cff",
    icons: [{ src: "/favicon.ico", sizes: "256x256", type: "image/x-icon" }],
  };
}
