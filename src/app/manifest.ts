import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "What's for dinner",
    short_name: "Dinner",
    start_url: "/",
    display: "standalone",
    background_color: "#faf7f2",
    theme_color: "#2f7d4f",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
