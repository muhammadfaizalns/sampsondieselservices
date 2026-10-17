# Sampson Heavy Diesel Services

Static website for Clive Sampson's truck, heavy equipment and agricultural machinery services across Victoria, Australia. The site uses an equipment focused Sampson logo, charcoal and high visibility yellow branding, a separate illustrated Clive Sampson profile, direct phone contact, and complete 3D assemblies and machinery.

Business contact: **0474 372 852**. Website copy uses **Sampson Heavy Diesel Services**, without an apostrophe. Do not introduce hyphens, en dashes or em dashes into visible website copy.

## Run locally

Python 3 is sufficient to serve the site. Run from the repository root:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Open <http://127.0.0.1:4173/>. An HTTP server is required for JavaScript modules, component models and the location dataset. Opening HTML through a file URL is not supported.

Serve `dist/` at the domain root. The GitHub Pages workflow builds a separate `_site/` directory with the required project subfolder paths. Keep the committed `dist/` directory: the generator reads the homepage as a template.

No npm install, framework build or third party API key is required. Node.js is used only for optional JavaScript syntax checks.

## Project layout

- `dist/`: complete deployable website, including HTML, CSS, JavaScript, fonts, images, model files and licences.
- `dist/index.html`: homepage and shared header source used by the page generator.
- `dist/style.css`: responsive layouts, local fonts and reduced motion styles.
- `dist/components.js`: ten complete assembly and machinery definitions, captions, creator and licence records.
- `dist/gearbox.js`: Three.js viewer, adaptive camera framing, model cache and motion controls.
- `dist/gearbox-loader.js`: viewport based lazy loading and static fallback handling.
- `dist/coverage.js`: browser side suburb and postcode lookup.
- `dist/assets/data/`: Victorian locality snapshot and provenance.
- `scripts/build-pages.py`: generates service pages, information pages, shared metadata, sitemap and robots file.
- `scripts/audit-site.py`: checks content constraints, metadata, structured data, local references, sitemap and required models.
- `scripts/assembly-sources.json`: active assembly sources, attribution, adaptation notes and output hashes.
- `scripts/component-sources.json`: provenance for earlier scanned component assets retained in the repository.
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
- Seven detailed service pages: truck servicing, heavy equipment servicing, agricultural machinery servicing, truck transmission repairs, component rebuilding, mobile diesel field service, and fleet and equipment maintenance. Existing truck service URLs remain available.
- Ten complete assembly and machinery examples: truck engine, transmission, turbocharger, differential, truck rear axle, steering axle, alternator, tractor and trailer, excavator and bulldozer.
- Smooth camera orbit, elevation and distance changes, pause, next angle, an automatic tour with 3.5 second slide slots and a native phone selector. The camera orbit takes 30 seconds independently of slide changes. Pause, reduced motion, offscreen state and hidden tabs stop the automatic tour. Slow loads consume the new slide slot and show loading rather than extending the previous slide.
- Lazy model loading, a three model cache with next model prefetch, capped rendering resolution, offscreen/background pause and reduced motion support.
- Victoria lookup using 2,988 locality/postcode pairs from a Vicmap Address snapshot dated 1 October 2026. Queries are filtered locally without sending search text to a lookup service.
- Thirteen pages prepared for indexing, unique metadata, canonical URLs, Organization and Service structured data, breadcrumbs, social preview metadata, sitemap and a 404 page.
- Website privacy notice, service information preserving Australian Consumer Law rights and asset credits.

The assemblies and machinery are illustrative examples, not photographs of customer work or a promise to service every shown part. The locality snapshot is not exhaustive postal delivery validation.

## Validation already performed

The original imported website was checked at CSS viewport widths 320, 390, 640, 768, 1024, 1440, 2560, 3840 and 4096 without horizontal overflow. All ten models loaded. Desktop keyboard selection, the phone component selector, camera pause and next angle controls were checked. Lookup cases covered Dandenong, 3175, Yalla Y Poora and an unmatched query.

The expanded site contains fifteen HTML files, including both 404 forms, and thirteen sitemap entries. The audit checks these generated pages and entries. It checks one H1 per page, unique indexable titles, valid JSON-LD, local links and fragments, duplicate IDs, required assets and visible text without dash characters.

Viewport checks do not establish testing on every physical device. Physical phone performance, full assistive technology testing and production Core Web Vitals remain launch validation work.

## Ownership and launch status

This repository imports website source snapshot `31ff70dfb40372a237c6713989b94d7ae855efc2`, which was published to the existing private Sites review URL on 1 October 2026:

<https://sampson-heavy-diesel.ft-64db.chatgpt.site/>

A GitHub push does not change the audience or publish a Sites deployment. The separate GitHub Pages review workflow publishes website changes from `main` to the public review URL described below. Preserve the existing Sites project identifier when using the Sites publishing workflow.

Public launch is pending website approval and confirmed owner details:

- Legal operator, business registration and ABN.
- Operating base, customer workshop access, actual hours and travel arrangements.
- Labour hire licence or applicable exclusion and the actual labour arrangement. Labour hire advertising is currently withheld. PR status or a trade qualification does not establish labour hire licensing.
- Contact email, enquiry and job record handling, scope, pricing, call out and approval practices.

Domain setup and Google Business Profile creation follow website approval. Do not invent locations, reviews, hours, licences, service guarantees or manufacturer affiliations. Search ranking cannot be guaranteed, and the suburb lookup does not itself create indexable locality landing pages. The website is not a certification of every business legal obligation.

## Third party assets

Retain the model, font, Three.js and Meshoptimizer licence files and credits under `dist/assets/` and `dist/credits/`. Model sources and adaptations are documented in the website and source records. Vicmap data is attributed to the State of Victoria, Department of Transport and Planning under CC BY 4.0. The supplied original photograph, standalone illustrated Clive Sampson profile, commissioned equipment logo and vehicle or machinery illustrations remain distinct from third party asset licences. The business logo does not use Clive’s portrait.

No blanket licence for the business branding or the entire repository is granted by the included third party licence files.

## GitHub Pages review deployment

Review URL: <https://muhammadfaizalns.github.io/sampsondieselservices/>

In repository Settings, open Pages and select **GitHub Actions** as the source. The `Deploy review to GitHub Pages` workflow deploys relevant changes pushed to `main`. To republish manually, open Actions, select that workflow and choose **Run workflow** on `main`.

The workflow audits the source, runs deployment regression tests, builds `_site/`, then uploads and deploys that directory. It reads the actual site URL from GitHub Pages configuration. `dist/` and the existing Sites deployment remain unchanged.

The review builder adapts internal page links, CSS fonts, application data and model requests, canonical URLs, social metadata, structured data and the sitemap for the project subfolder. Every HTML page gets `noindex, nofollow, noarchive`. This discourages search indexing but does not provide access control: the GitHub Pages review website is public.

To build and test the review artifact locally:

```sh
python3 -m unittest discover -s tests -v
python3 scripts/build-github-pages.py --site-url https://muhammadfaizalns.github.io/sampsondieselservices/
```

`_site/` is generated and ignored by Git. The builder replaces only an output directory bearing its own marker; it refuses to overwrite unrelated directories. Keep the review workflow and indexing policy separate from the approved public business launch.

## Complete assembly gallery update

The current gallery replaces isolated blocks, housings, gears and brackets with complete assemblies and machinery. Active source records and SHA256 hashes are in `scripts/assembly-sources.json`. Original model attribution and licence links are shown on the credits page, with per model records under `dist/assets/models/`. The transmission retains its bundled CC BY 3.0 licence. The other active models are CC BY 4.0. Assets were optimized and Meshopt compressed for web display. Source material colours are retained, with the truck engine finish adapted to the brand palette.

The no WebGL engine poster is adapted from the original engine model preview by andreviewport under the same CC BY 4.0 licence. It represents the complete engine, not the former bare engine block.

For this update, all ten assemblies were rendered in the browser and their framing reviewed. The gallery and phone selector were checked at 390, 768 and 2560 CSS pixel widths without horizontal overflow. Browser observations confirmed the 3.5 second tour cadence, a maximum of three cached models and a stable paused camera and selection. The site audit, three deployment builder tests, JavaScript syntax checks and Git whitespace checks pass.
