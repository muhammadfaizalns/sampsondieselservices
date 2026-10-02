# Sampson Heavy Diesel Services

Static website for Clive Sampson's truck and heavy diesel services across Victoria, Australia. The site uses the approved Sampson portrait logo, charcoal and high visibility yellow branding, direct phone contact, and real scanned mechanical components.

Business contact: **0474 372 852**. Website copy uses **Sampson Heavy Diesel Services**, without an apostrophe. Do not introduce hyphens, en dashes or em dashes into visible website copy.

## Run locally

Python 3 is sufficient to serve the site. Run from the repository root:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Open <http://127.0.0.1:4173/>. An HTTP server is required for JavaScript modules, component models and the location dataset. Opening HTML through a file URL is not supported.

Serve `dist/` at the domain root. Default GitHub project Pages subpaths require base path changes. Keep the committed `dist/` directory: the generator reads the homepage as a template.

No npm install, framework build or third party API key is required. Node.js is used only for optional JavaScript syntax checks.

## Project layout

- `dist/`: complete deployable website, including HTML, CSS, JavaScript, fonts, images, model files and licences.
- `dist/index.html`: homepage and shared header source used by the page generator.
- `dist/style.css`: responsive layouts, local fonts and reduced motion styles.
- `dist/components.js`: ten model definitions, captions, source links and material settings.
- `dist/gearbox.js`: Three.js viewer, adaptive camera framing, model cache and motion controls.
- `dist/gearbox-loader.js`: viewport based lazy loading and static fallback handling.
- `dist/coverage.js`: browser side suburb and postcode lookup.
- `dist/assets/data/`: Victorian locality snapshot and provenance.
- `scripts/build-pages.py`: generates service pages, information pages, shared metadata, sitemap and robots file.
- `scripts/audit-site.py`: checks content constraints, metadata, structured data, local references, sitemap and required models.
- `scripts/component-sources.json`: provenance for the additional scanned components.
- `.openai/hosting.json`: existing Sites project identifier and static output directory. It contains no authentication token.

## Edit and validate

Edit generated service, privacy, credits and service area content in `scripts/build-pages.py`, then regenerate:

```sh
python3 scripts/build-pages.py
python3 scripts/audit-site.py
node --check dist/components.js
node --check dist/coverage.js
node --check dist/gearbox-loader.js
node --check dist/gearbox.js
node --check dist/motion.js
```

The generator uses only the Python standard library. Commit both generator changes and the generated `dist/` files.

The default canonical origin is the existing review website. When moving from that origin to an approved custom domain, regenerate with the actual domain and inspect all generated URLs:

```sh
SITE_ORIGIN=https://your-approved-domain.example python3 scripts/build-pages.py
python3 scripts/audit-site.py
```

Replace the example with the real approved domain. For later domain changes, first update the homepage canonical and Open Graph origin as well; the current generator only replaces the original Sites origin automatically. Domain registration, DNS changes, redirects, site access changes and business profile creation are separate launch actions.

## Website features

- Direct call and SMS links, a fixed mobile contact bar, visible keyboard focus and responsive navigation.
- Five detailed service pages: truck servicing, transmission repairs, component rebuilding, mobile field service and fleet maintenance.
- Ten scanned mechanical examples: engine block, transmission housing, turbine wheel, piston, crankshaft, water pump, drive gear, steering joint, suspension bracket and compressor.
- Camera orbit, elevation and distance changes, pause, next angle, automatic component tour and a native phone selector.
- Lazy model loading, a three model cache, capped rendering resolution, offscreen/background pause and reduced motion support.
- Victoria lookup using 2,988 locality/postcode pairs from a Vicmap Address snapshot dated 1 October 2026. Queries are filtered locally without sending search text to a lookup service.
- Eleven pages prepared for indexing, unique metadata, canonical URLs, Organization and Service structured data, breadcrumbs, social preview metadata, sitemap and a 404 page.
- Website privacy notice, service information preserving Australian Consumer Law rights and asset credits.

The components are illustrative examples, not photographs of customer work or a promise to service every shown part. The locality snapshot is not exhaustive postal delivery validation.

## Validation already performed

The imported website was checked at CSS viewport widths 320, 390, 640, 768, 1024, 1440, 2560, 3840 and 4096 without horizontal overflow. All ten models loaded. Desktop keyboard selection, the phone component selector, camera pause and next angle controls were checked. Lookup cases covered Dandenong, 3175, Yalla Y Poora and an unmatched query.

The audit covers thirteen HTML files, including both 404 forms, and eleven sitemap entries. It checks one H1 per page, unique indexable titles, valid JSON-LD, local links and fragments, duplicate IDs, required assets and visible text without dash characters.

Viewport checks do not establish testing on every physical device. Physical phone performance, full assistive technology testing and production Core Web Vitals remain launch validation work.

## Ownership and launch status

This repository imports website source snapshot `31ff70dfb40372a237c6713989b94d7ae855efc2`, which was published to the existing private Sites review URL on 1 October 2026:

<https://sampson-heavy-diesel.ft-64db.chatgpt.site/>

A GitHub push does not itself change the audience or publish a Sites deployment. Preserve the existing Sites project identifier when using the Sites publishing workflow.

Public launch is pending website approval and confirmed owner details:

- Legal operator, business registration and ABN.
- Operating base, customer workshop access, actual hours and travel arrangements.
- Labour hire licence or applicable exclusion and the actual labour arrangement. Labour hire advertising is currently withheld. PR status or a trade qualification does not establish labour hire licensing.
- Contact email, enquiry and job record handling, scope, pricing, call out and approval practices.

Domain setup and Google Business Profile creation follow website approval. Do not invent locations, reviews, hours, licences, service guarantees or manufacturer affiliations. Search ranking cannot be guaranteed, and the suburb lookup does not itself create indexable locality landing pages. The website is not a certification of every business legal obligation.

## Third party assets

Retain the model, font, Three.js and Meshoptimizer licence files and credits under `dist/assets/` and `dist/credits/`. Model sources and adaptations are documented in the website and source records. Vicmap data is attributed to the State of Victoria, Department of Transport and Planning under CC BY 4.0. The supplied business portrait, commissioned logo and truck illustration remain distinct from third party asset licences.

No blanket licence for the business branding or the entire repository is granted by the included third party licence files.
