import { defineConfig } from "vite";

const base = "/haritha-industries-/";
const legacyRoutes = {
  "home.html": "home",
  "products.html": "products",
  "certs.html": "quality",
  "certificate.html": "quality",
  "financials.html": "financials",
  "contactus.html": "contact",
};

export default defineConfig({
  base,
  plugins: [
    {
      name: "preserve-legacy-page-links",
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          const file = request.url?.split("?")[0].split("/").pop();
          if (!legacyRoutes[file]) return next();
          response.statusCode = 302;
          response.setHeader("Location", `${base}#${legacyRoutes[file]}`);
          response.end();
        });
      },
      generateBundle() {
        for (const [fileName, section] of Object.entries(legacyRoutes)) {
          this.emitFile({
            type: "asset",
            fileName,
            source: `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="refresh" content="0;url=./#${section}"><title>Haritha Industries</title></head><body><a href="./#${section}">Continue to Haritha Industries</a></body></html>`,
          });
        }
      },
    },
  ],
});
