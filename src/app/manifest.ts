import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Algebra Quest",
    short_name: "Algebra Quest",
    description: "A 9th grade algebra skill-builder with quests, XP, streaks and boss battles.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf9f5",
    theme_color: "#faf9f5",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
