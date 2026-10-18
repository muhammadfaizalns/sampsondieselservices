# Sampson Heavy Diesel Services

Static website for Clive Sampson's truck, heavy equipment and agricultural machinery services across Victoria, Australia. The site uses an equipment focused Sampson logo, charcoal and high visibility yellow branding, a text profile for Clive Sampson, direct phone contact, and complete 3D assemblies and machinery.

Business contact: **0474 372 852**. Website copy uses **Sampson Heavy Diesel Services**, without an apostrophe. Do not introduce hyphens, en dashes or em dashes into visible website copy.

## Run locally

Python 3 is sufficient to serve the site. Run from the repository root:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Open <http://127.0.0.1:4173/>. An HTTP server is required for JavaScript modules, component models and the location dataset. Opening HTML through a file URL is not supported.

Serve `dist/` at the domain root. The GitHub Pages workflow builds a separate `_site/` directory with the required project subfolder paths. Keep the committed `dist/` directory: the generator reads the homepage as a template.

No npm install, framework build or third party API key is required to preview committed source. Production validation additionally requires Node.js 22 or later; `npm ci` installs the pinned Cloudflare deployment tooling.

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
- `scripts/audit-search-readiness.py`: checks offline canonical, metadata, identity, sitemap and indexing policy consistency for review or production artifacts. It does not measure indexing or rankings.
- `scripts/site_urls.py`: validates the canonical root origin and keeps repeated domain migrations consistent.
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

Replace the example with the real approved domain. The generator reads the current homepage canonical, updates it and other first party metadata to the requested origin, and keeps that origin on subsequent runs without an override. Repeated migrations are covered by regression tests. Source generation requires an HTTPS domain root; use the separate review builder for a project subfolder. Domain registration, DNS changes, redirects, site access changes and business profile creation are separate launch actions.

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

The website is live at **https://sampsonheavydiesel.com**, registered through Cloudflare and hosted on Cloudflare Pages project **sampson-heavy-diesel**. Automatic `main` deployment of commit `28fc732` passed on 18 October 2026. Live checks confirmed thirteen indexable pages, ten model assets, real 404 responses, security headers, apex HTTPS, and HTTP, www and production Pages hostname redirects preserving paths and query strings. Cloudflare Web Analytics inserts exactly one beacon; its dashboard showed nine page views and nine visits during launch checks, including test traffic. GA4 remains off because the owner deferred its Measurement ID. Search Console domain ownership is verified in Clive Sampson's account, and Google accepted the sitemap with thirteen discovered pages. Homepage and mobile service page passed explicit Google live tests. Three indexing requests, also including the services hub, entered the priority queue after eligibility checks. This does not confirm indexing. Search generative AI is visibly set to **Include**. Bing confirms Clive as its sole DNS verified administrator, and its accepted sitemap is processing. Confirm remaining operator details without inventing them:

- Legal operator, business registration and ABN.
- The user confirmed **Bunyip 3815** as the base and that customers cannot currently visit. The private street address must never appear in the repository or public website. Actual hours and travel arrangements still need confirmation. Other localities sharing postcode 3815 do not establish branches.
- Labour hire licence or applicable exclusion and the actual labour arrangement. Labour hire advertising is currently withheld. PR status or a trade qualification does not establish labour hire licensing.
- Contact email, enquiry and job record handling, scope, pricing, call out and approval practices.

Use the purchased domain for production. Basic Google Business Profile is created in Clive's account after authorized terms acceptance, using the exact business name, **Diesel engine repair service** category, Bunyip VIC service area, phone and website. No hours, chat or marketing opt in were added. Customers cannot visit and no location is public. A private address was supplied only to Google's hidden verification; it must never enter source files or the website. Google requires a real business verification video from the owner; setup is left at **Start recording**, and the profile is unverified and not publicly visible. Do not invent locations, reviews, hours, licences, service guarantees or manufacturer affiliations. Search ranking cannot be guaranteed, and the suburb lookup does not itself create indexable locality landing pages. The website is not a certification of every business legal obligation.

## Third party assets

Retain the model, font, Three.js and Meshoptimizer licence files and credits under `dist/assets/` and `dist/credits/`. Model sources and adaptations are documented in the website and source records. Vicmap data is attributed to the State of Victoria, Department of Transport and Planning under CC BY 4.0. The commissioned equipment logo and vehicle or machinery illustrations remain distinct from third party asset licences. Clive’s supplied photograph and illustrated portrait are retained source artwork and are not displayed or linked in the current website or Person metadata. The business logo does not use Clive’s portrait.

No blanket licence for the business branding or the entire repository is granted by the included third party licence files.

## GitHub Pages review deployment

Review URL: <https://muhammadfaizalns.github.io/sampsondieselservices/>

In repository Settings, open Pages and select **GitHub Actions** as the source. The `Deploy review to GitHub Pages` workflow deploys relevant changes pushed to `main`. To republish manually, open Actions, select that workflow and choose **Run workflow** on `main`.

The workflow audits the source, runs regression tests, builds `_site/`, checks review search directives and identity consistency, then uploads and deploys that directory. It reads the actual site URL from GitHub Pages configuration. `dist/` and the existing Sites deployment remain unchanged.

The review builder adapts internal page links, CSS fonts, application data and model requests, canonical URLs, social metadata, structured data and the sitemap for the project subfolder. Every HTML page gets `noindex, nofollow, noarchive`. This discourages search indexing but does not provide access control: the GitHub Pages review website is public.

To build and test the review artifact locally:

```sh
python3 -m unittest discover -s tests -v
python3 scripts/build-github-pages.py --site-url https://muhammadfaizalns.github.io/sampsondieselservices/
python3 scripts/audit-search-readiness.py --directory _site --site-url https://muhammadfaizalns.github.io/sampsondieselservices/ --mode review
```

`_site/` is generated and ignored by Git. The builder replaces only an output directory bearing its own marker; it refuses to overwrite unrelated directories. Keep the review workflow and indexing policy separate from the approved public business launch.

## Complete assembly gallery update

The current gallery replaces isolated blocks, housings, gears and brackets with complete assemblies and machinery. Active source records and SHA256 hashes are in `scripts/assembly-sources.json`. Original model attribution and licence links are shown on the credits page, with per model records under `dist/assets/models/`. The transmission retains its bundled CC BY 3.0 licence. The other active models are CC BY 4.0. Assets were optimized and Meshopt compressed for web display. Source material colours are retained, with the truck engine finish adapted to the brand palette.

The no WebGL engine poster is adapted from the original engine model preview by andreviewport under the same CC BY 4.0 licence. It represents the complete engine, not the former bare engine block.

The gallery loader, viewer and model manifest use versioned import URLs so returning visitors receive the current assembly list. Bump that import chain whenever the viewer or manifest changes.

For this update, all ten assemblies were rendered in the browser and their framing reviewed. The gallery and phone selector were checked at 390, 768 and 2560 CSS pixel widths without horizontal overflow. Browser observations confirmed the 3.5 second tour cadence, a maximum of three cached models and a stable paused camera and selection. The site audit, three deployment builder tests, JavaScript syntax checks and Git whitespace checks pass.

## Search launch and measurement

The review URL is intentionally noindex. Better structure, valid metadata or attractive 3D models do not prove better Google rankings, AI citations or more calls. Current checks validate artifacts, not search engine decisions. No first position guarantee is made for any suburb, postcode or AI answer.

The approved business domain now has a dedicated production builder. Prepare its isolated artifact and check search readiness:

```sh
python3 scripts/prepare-launch.py
python3 scripts/audit-search-readiness.py --directory _production --site-url https://sampsonheavydiesel.com --mode production
```

That command does not launch a website. Deploy production separately from the noindex review workflow. Verify real HTTP status, canonical and indexing headers, root robots.txt, sitemap and crawler access on the actual production host. A robots.txt file under a GitHub project subfolder does not control the hostname root. Keep 404 pages noindex and outside the sitemap.

The confirmed base is Bunyip 3815; customers cannot currently visit. Keep the private street address out of source files and the public website. Confirm business identity, hours, supported equipment and travel terms before adding more operational claims. Configure a genuine service area Business Profile under Google's current rules. Do not create fake branches or change the business name to include search keywords.

Google Search Console verified Domain property `sampsonheavydiesel.com` in Clive Sampson's account on 18 October 2026 using one Cloudflare TXT record. Keep the DNS verification record; its token is not stored in the repository. The canonical sitemap shows **Success**, with thirteen discovered pages and zero videos. Homepage and `/services/mobile-truck-mechanic/` passed explicit Google live URL tests. Three indexing requests, also including `/services/`, entered the priority queue after eligibility checks. Mobile inspection reported a successful smartphone fetch, crawl and indexing allowed, the intended canonical and one valid breadcrumb. Initial indexed status was **Discovered, currently not indexed**; requests do not establish indexing. Search Console Settings visibly confirms **Search generative AI: Include**; the existing default required no change. Continue checking crawler access, indexing and snippet eligibility. Google AI features do not require special schema. Bing Webmaster Tools confirms Clive Sampson as its sole verified administrator, with **Verified by: DNS** through manual CNAME verification. Its accepted sitemap is **Processing**, with one known sitemap, zero errors and zero warnings; URLs have not yet been read. Keep the verification DNS record. No Google Search Console read access was granted, and no Clarity or advertising setup was added. Google Business Profile awaits the owner's real business verification video. Request honest reviews from real customers without incentives or selective filtering. Develop useful service or regional pages backed by actual work; the postcode lookup is not thousands of indexed pages.

Collect original job evidence with customer permission: machine type, actual locality, concern, diagnosis, work completed, tested outcome and photos. Clive must review technical statements. Licensed 3D examples and commissioned illustrations are not customer job evidence. Do not invent completed work, credentials, endorsements, ratings or response times.

Measure indexed pages, nonbrand queries and clicks, Google AI impressions, Bing AI citations and actual qualified calls and bookings. Keep query, location, date, device and exact AI prompt fixed when sampling results. Citation order or one successful prompt is not a universal ranking. A phone link tap is not a completed call. GA4 consent controls are prepared for production but remain disabled without the owner's Measurement ID. No call tracking service has been added.

Mobile performance still needs real device and field measurement. The gallery is lazy and its cache is bounded, but watching the full tour can download about 17.3 MB of models. Test rural mobile conditions and prioritize access to the phone number and service text. Header image variants and an optional low data viewer are performance work to consider after measurement.

Official guidance checked on 18 October 2026: [Google AI optimization](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide), [local ranking](https://support.google.com/business/answer/7091?hl=en), [service areas](https://support.google.com/business/answer/9157481?hl=en), [Google Search AI control](https://support.google.com/webmasters/answer/16908024), [Google AI measurement](https://support.google.com/webmasters/answer/16984139), [OpenAI crawlers](https://developers.openai.com/api/docs/bots), [Claude crawlers](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler), [Perplexity crawlers](https://docs.perplexity.ai/docs/resources/perplexity-crawlers), and [Australia Post 3815](https://auspost.com.au/postcode/3815). Google states it does not use llms.txt for Search visibility; no special AI schema or fabricated crawler instructions have been added.

Metadata review on 18 October 2026 covered all thirteen sitemap pages: unique titles of 40 to 57 decoded characters and unique descriptions of 109 to 155 characters after the keyword wording update, including spaces and punctuation. These are editorial lengths, not Google limits; title links and snippets may be rewritten or truncated according to query and device width. Shorter information and credits summaries do not need filler. See [Google title guidance](https://developers.google.com/search/docs/appearance/title-link) and [description guidance](https://developers.google.com/search/docs/appearance/snippet).

Coverage, mobile service and fleet pages now explain enquiries from outside Victoria for equipment located inside Victoria, with on site contacts, work authorisation and the international phone format. Homepage FAQ covers this arrangement too. Actual service area remains Victoria; a caller's interstate or overseas location does not create an interstate branch or service territory.

## Keyword targeting

The 18 October 2026 copy review assigns each established page a service intent. These are editorial targets based on confirmed services and customer terminology, not measured search volumes or ranking results.

| Page | Main topic | Supporting language |
| --- | --- | --- |
| Home | Diesel mechanic Victoria | Heavy diesel service and repair |
| Truck servicing | Truck servicing Victoria | Truck maintenance and service records |
| Heavy equipment | Heavy equipment servicing Victoria | Heavy equipment mechanic and maintenance |
| Agricultural machinery | Farm machinery servicing Victoria | Agricultural machinery and seasonal maintenance |
| Transmission | Truck transmission repairs Victoria | Truck gearbox repairs, shifting and loss of drive |
| Component rebuilding | Diesel component rebuilding Victoria | Component repair, assessment and rebuilding |
| Mobile service | Mobile diesel mechanic Victoria | Mobile truck mechanic, field service and breakdown enquiries |
| Fleet maintenance | Fleet maintenance Victoria | Scheduled servicing and preventive maintenance |
| Service areas | Diesel mechanic 3815 | Victoria locations, travel and interstate coordination |

The generator maintains service titles, descriptions, headings and visible link labels. The homepage service links use the same descriptive labels. Gearbox and transmission terms share one repair page; farm and agricultural terms share one machinery page. Existing URLs stay stable. The service area lookup remains a location tool, not thousands of indexable landing pages.

Narrower engine, hydraulic, electrical, manufacturer or machine specialties require Clive's confirmation before promotion. Gallery models do not establish those capabilities. Broader keyword coverage requires genuine service facts and repair evidence rather than invented experience, repeated suburb lists or a keyword density target. Review search query and page performance after the approved production launch, then compare qualified enquiries and bookings over time.

Guidance checked: [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide) and [Google spam policies](https://developers.google.com/search/docs/essentials/spam-policies). Google recommends clear useful content and descriptive links; it does not use the meta keywords tag.


## Cloudflare production hosting

Follow [the production launch guide](docs/PRODUCTION-LAUNCH.md) for account ownership, Pages deployment, DNS, HTTPS, analytics, search services, live checks and rollback. Hosting uses Cloudflare Pages Git integration, with no application server, database, customer login or runtime secret.

`wrangler.jsonc` defines Pages project `sampson-heavy-diesel` and build output `_production/`. The production branch is `main`; the dashboard build command is `python3 scripts/prepare-launch.py`, with `NODE_VERSION=22` and `PYTHON_VERSION=3.13`. Pushes to `main` trigger Pages production builds. The apex domain is associated through Pages Custom domains and serves HTTPS. Configuration alone does not associate another custom hostname.

The separate GitHub Pages workflow continues to publish its nonindexed review build. The production Pages hostname redirects to the apex with a verified 301 preserving path and query string. Automatic preview branch deployment is set to **None**. Historical previews receive `noindex` headers; these are indexing controls, not privacy controls. Use Cloudflare Access if preview privacy is needed. The www hostname uses proxied A record `192.0.2.1` and a verified exact hostname 301 redirect preserving path and query string.

Install pinned deployment tooling with `npm ci`, then prepare the production artifact:

```sh
python3 scripts/prepare-launch.py
npx wrangler pages dev _production --ip 127.0.0.1 --port 8788
```

The first command generates and audits source, runs Python and analytics regressions, checks JavaScript and builds `_production/` with production canonicals, schema, social metadata, robots and sitemap. It does not publish anything. The second starts a local Pages emulator for HTTP checks. Stop it after checking successful pages, an unknown 404 path and security headers. Production updates normally deploy through the connected Git integration. Manual CLI deployment uses `npx wrangler pages deploy _production --project-name sampson-heavy-diesel --branch main` only after verifying the correct Cloudflare account. GitHub and Cloudflare build settings are in the launch guide.

The production builder refuses to overwrite an unrelated directory. It excludes removed portraits, older logos, unused model binaries, dotfiles, symlinks and source configuration, while retaining active assets and third party licences. Source artwork remains in the repository. Production has thirteen indexable content pages; error pages remain noindex and unknown paths use an actual 404 response.

Production `_headers` sets a Content Security Policy, anti framing, content type protection, referrer and feature policies. The gallery requires embedded WebAssembly plus blob texture fetching; no general inline script or JavaScript eval allowance is used. HTML and application scripts revalidate; mutable assets use a modest one day browser cache. Initial HSTS is one day on the production hostname, without subdomain enforcement or preload. Increase it only after live HTTPS checks. Dashboard HSTS should remain off while the repository supplies this policy.

Cloudflare Web Analytics automatic setup for the production hostname is complete. The live browser contains exactly one Cloudflare beacon and no Google scripts; the dashboard received launch test traffic. The repository does not inject a duplicate beacon. The policy permits its script and reporting endpoints. Privacy disclosure is applied only to the production build; the review notice continues to describe review technology.

GA4 stays disabled until `GA4_MEASUREMENT_ID` is supplied as a Cloudflare build variable. The public ID must match the current `G-` plus ten uppercase letter/digit format. Never put a Cloudflare API token, password or Google service account key into these files. With a valid ID, the builder adds the consent module and matching Google disclosure. Google code does not load before acceptance. Visitors can decline or withdraw; call and SMS links remain independent. The module sends one sanitized page view and manual `phone_click` / `sms_click` intent events. It uses published canonical paths and origin only referrers, excluding visitor query text, arbitrary error paths, link contents and lookup values. Turn GA4 Enhanced measurement off to avoid extra automatic events outside that allowlist, and keep Google Signals and ad personalisation off. Campaign query attribution is intentionally limited by this minimisation policy.

Python tests cover production isolation, indexing, output pruning, configuration rejection and provider injection. Analytics tests cover consent persistence and expiry, withdrawal and pending load races, cross tab changes, blocked storage, single page views, preview suppression, sanitized events and contact behavior. Local emulator checks cover textured models under CSP, postcode lookup and correct 200/404 responses. The deployed apex passed HTTP status, asset, indexing and header checks. Live browser checks rendered a 3D canvas without warnings or errors; the 390 pixel mobile viewport had no horizontal overflow, and postcode 3815 returned its four locality matches. Full (strict) SSL, Always Use HTTPS, minimum TLS 1.2, TLS 1.3, WAF and DDoS protection are configured. DNSSEC DS records propagated through public resolvers `1.1.1.1` and `8.8.8.8`, with validation confirmed through Google DNS. Search, Agent and Training bot policies currently allow access, with bot preference synchronization off. Cloudflare analytics delivery is verified. Google and Bing ownership and sitemap submission are complete. Google's two explicit live tests passed, three indexing requests were accepted, and Search generative AI remains Include. Actual indexing, Bing sitemap processing and provider crawler verification remain separate work.
