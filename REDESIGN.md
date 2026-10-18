# Haritha Industries redesign

A single-page Vite site in an industrial editorial direction: warm paper (`#F3F0E8`), graphite (`#17191C`) and one rust-orange accent (`#C2410C`) taken from the logo. Headlines use Archivo (semi-condensed, uppercase), body text uses IBM Plex Sans, and technical labels use IBM Plex Mono. Square corners, hairline rules and numbered sections give it the feel of an engineering drawing's title block. Every photograph is Haritha's own.

## Page structure

1. **Hero:** headline, quote and equipment actions, credentials, and a real shop-floor photo, followed by a category bar that opens the catalogue already filtered.
2. **Clients:** the published client-logo strip.
3. **Equipment (`#products`):** the seven product lines from the original catalogue (pressure vessels, cladded pressure vessels, heat exchangers, U-tube heat exchangers, reactors, pressure piping, tanks & other fabrication), each shown with its own product photo, plus a custom-requirement card. Filters, detail dialogs and the "enquire about this equipment" handoff to the form.
4. **Company (`#about`):** the published mission and quality statements, a company-profile link and the four-step project process.
5. **Workshop (`#gallery`):** three workshop photos with an enlargeable viewer.
6. **Quality (`#quality`):** four certificate cards with thumbnails and a document viewer, plus company profile and financial statement downloads (`#resources`, `#financials`).
7. **Contact (`#contact`):** email, phone, works address and the enquiry form.

## Run and build

```sh
npm run dev
npm run build
npm run preview
```

The deployment base `/haritha-industries-/` is set in `vite.config.js`. Legacy page URLs (`home.html`, `products.html`, `certs.html`, `certificate.html`, `financials.html`, `contactus.html`) redirect to the matching sections.

## Main files

- `index.html`: content, navigation, form and native dialogs.
- `src/style.css`: the full visual system (tokens at the top) and responsive rules.
- `src/main.js`: product data, catalogue filtering, dialogs and viewers, mobile navigation and enquiry preparation.
- `src/motion.js`: GSAP entrance and scroll reveals, all disabled under reduced motion.

## Enquiry behaviour

The form validates the required fields and prepares a reviewable email to `info@harithaindustries.com` that visitors send from their own email app, where they can attach drawings. A copy option is the fallback. Nothing is sent to a server or stored.

## Content notes

- Product names follow the original company product list. The earlier redesign had attached six of the seven photos to the wrong product names. The red titles baked into the original product images are cropped off (`public/media/product-*.webp`, from `.design/raw-assets/`).
- The hero image is a detail crop of the first gallery photo (`hero-workshop*.webp`).
- AI-generated illustrations are no longer used. The previous version's files are kept under `.design/chatgpt-version/` (including its last build).
- The certificates carry historical validity dates. The page says so and asks visitors to request current certificates. Replace the files when current documents are available.

## Validation

- Production build passes (about 6 KB CSS and 50 KB JS gzipped).
- Playwright checks: content visible after scroll-triggered motion; category links and all filters; product names; product dialog, Escape and enquiry preselection; gallery and certificate viewers; form validation, mailto preparation and edit; no broken images or console errors; mobile menu; no horizontal overflow or clipped headline at 320, 375, 768, 1024, 1280 and 1920 px.
- axe WCAG 2.1 A/AA scans report no violations on desktop, mobile and the product dialog. This is an automated check, not a full conformance audit.
