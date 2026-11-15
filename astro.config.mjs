// @ts-check
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  // Endereço final do site (usado em links absolutos). Ajuste ao ligar o domínio.
  site: "https://emporioladobe.com.br",
  trailingSlash: "always",
  // Páginas são geradas no build; só /api/* roda sob demanda no Worker.
  output: "static",
  adapter: cloudflare({ imageService: "compile" }),
  session: false,
  build: { format: "directory" },
});
