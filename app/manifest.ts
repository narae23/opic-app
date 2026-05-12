import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OPIc Script Builder",
    short_name: "OPIc",
    description: "개인화된 OPIc 스크립트 생성 및 암기",
    start_url: "/",
    display: "standalone",
    background_color: "#030712",
    theme_color: "#1d4ed8",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
