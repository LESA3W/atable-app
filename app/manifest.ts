import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "À table !",
    short_name: "À table",
    description: "Les goûts de la famille, et des idées de repas qui plaisent à tout le monde.",
    start_url: "/semaine",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FEF5EE",
    theme_color: "#F26F1C",
    lang: "fr",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],

  };
}
