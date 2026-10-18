# Production launch: sampsonheavydiesel.com

Prepared 18 October 2026. Follow these steps in order. The target address is **https://sampsonheavydiesel.com**. GitHub Pages remains a separate, nonindexed review site.

Cloudflare Workers Static Assets suits this static website and is Cloudflare's current recommendation for new deployments. The repository supplies the build, security headers, canonical URLs and sitemap. Cloudflare supplies hosting, DNS and certificates. No service can promise complete security, legal compliance or first place in search. [Hosting recommendation](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/).

## 1. Secure ownership first

Use accounts controlled by Clive or the business. Invite helpers as separate members rather than sharing passwords. Enable passkeys or two factor authentication for Cloudflare, GitHub and Google; store recovery codes offline. Confirm recovery email access.

In Cloudflare **Domain Registration > Manage Domains > sampsonheavydiesel.com**, check contact information, auto renewal, payment method and transfer lock. Accept provider terms yourself when prompted. Under the domain, confirm its status is **Active**. Keep Cloudflare nameservers.

Open **DNS > Settings > DNSSEC**. Enable it if disabled, then confirm its status becomes active. Cloudflare Registrar manages the registrar side; do not copy unrelated DS records. Export existing DNS records before changes. Preserve MX, SPF, DKIM, DMARC and verification records used by email or other services. [DNSSEC](https://developers.cloudflare.com/dns/dnssec/).

## 2. Connect hosting to GitHub

Open [Cloudflare dashboard](https://dash.cloudflare.com/), then **Workers & Pages > Create application > GitHub**. Authorize Cloudflare for **Only select repositories**, choosing `muhammadfaizalns/sampsondieselservices`.

Select that repository. Enter:

| Setting | Value |
| --- | --- |
| Worker name | `sampson-heavy-diesel` |
| Production branch | `main` |
| Root directory | Repository root; leave blank if optional |
| Build command | `python3 scripts/prepare-launch.py` |
| Deploy command | `npx wrangler deploy` |

The Worker name must match `wrangler.jsonc`. The package lock pins Wrangler; keep automatic dependency installation enabled so the build installs it. The configuration serves `_production`, uses real 404 responses and attaches the purchased apex domain. It disables public `workers.dev` and version preview URLs. Do not enable automatic nonproduction branch deployment until its access and indexing controls have been reviewed. [Git integration](https://developers.cloudflare.com/workers/ci-cd/builds/), [build settings](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/).

Choose **Save and Deploy**. Wait for a successful deployment, then open the custom domain. This step publishes the production website. Later pushes to `main` automatically publish updates.

If domain attachment fails, inspect **DNS > Records** for a conflicting apex record. Remove an old parking or placeholder web record only after confirming its purpose. Do not delete mail records. Retry deployment. Cloudflare creates the custom domain DNS record and certificate. Check **Worker > Settings > Domains & Routes** for the expected domain. Do not also attach the same hostname to GitHub Pages. [Custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).

## 3. Redirect www and enforce HTTPS

In **DNS > Records**, add this record if no existing `www` service must be retained:

| Type | Name | Address | Proxy status |
| --- | --- | --- | --- |
| A | `www` | `192.0.2.0` | Proxied, orange cloud |

This reserved address is a redirect placeholder, not a server. Open **Rules > Redirect Rules > Create rule**. Name it `WWW to canonical domain`. Use a custom filter expression:

```text
http.host eq "www.sampsonheavydiesel.com"
```

Choose dynamic redirect target:

```text
concat("https://sampsonheavydiesel.com", http.request.uri.path)
```

Set **301** and **Preserve query string**, then deploy the rule. Under **SSL/TLS > Edge Certificates**, enable **Always Use HTTPS**, set **Minimum TLS Version: 1.2**, and keep TLS 1.3 enabled. Wait for active certificates before announcing the site. Workers handles its own hosting connection; there is no separate origin server to configure. [Redirect guidance](https://developers.cloudflare.com/rules/url-forwarding/examples/redirect-www-to-root/).

The production bundle starts HSTS with a one day policy. Leave dashboard HSTS disabled to avoid overlapping settings. After HTTPS and redirects work reliably, increase the repository policy deliberately. Keep `includeSubDomains` and preload off until all affected services have been assessed. HSTS makes working HTTPS mandatory for returning visitors. [HSTS requirements](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/http-strict-transport-security/).

Cloudflare applies automatic DDoS protection. Its Free Managed Ruleset is deployed by default on Free plans. Review **Security > Settings** and security events; investigate blocked genuine visits before adding stricter rules. Paid WAF upgrades are optional, not prerequisites for this static site. [DDoS protection](https://developers.cloudflare.com/ddos-protection/about/), [WAF defaults](https://developers.cloudflare.com/waf/get-started/).

## 4. Enable useful analytics

In Cloudflare **Web Analytics > Add a site**, select `sampsonheavydiesel.com`, then **Done**. Keep automatic setup for this proxied domain. Do not paste another Cloudflare beacon into the website. The security policy permits its script and reporting endpoint. Confirm a real visit appears in its dashboard. This measures visits and performance, not completed calls. [Web Analytics setup](https://developers.cloudflare.com/web-analytics/get-started/).

For enquiry attribution, use the existing [Google Analytics](https://analytics.google.com/) property. Confirm **Australia/Melbourne** reporting time and **AUD** currency. Open its **Web** stream and set the website URL to the HTTPS apex address. Copy its measurement ID, which starts with `G-`. Keep ownership with Clive or the business.

In **Worker > Settings > Build > Build Variables and Secrets**, add `GA4_MEASUREMENT_ID` with that ID and redeploy. This ID is public configuration, not a password. The production website loads GA4 only after analytics consent; visitors can decline or withdraw using its privacy controls. Confirm the privacy notice matches the enabled providers before switching it on. [GA4 setup](https://support.google.com/analytics/answer/9304153?hl=en).

Use this consent module as the only GA4 installation; do not also add the same property through Google Tag Manager or Cloudflare Zaraz. Keep Google signals and advertising personalization off. Turn **Enhanced measurement off** for this web stream so automatic link, form and search events do not collect information outside the custom event allowlist. Our code sends the required page view and contact events. Enable email and query parameter redaction as defence in depth; do not rely on redaction instead of careful event design. Choose event retention deliberately; 14 months supports annual comparisons where appropriate. In GA4 Realtime, test consent acceptance and a phone or SMS click. Mark `phone_click` and `sms_click` as key events after they appear, preferably counted once per session for enquiry intent reporting. These mean contact intent, not answered calls, customers or booked jobs. Record those outcomes separately. Never send names, phone message content or other personal details as analytics parameters. [Key events](https://support.google.com/analytics/answer/9267568?hl=en).

## 5. Connect search services

Open [Google Search Console](https://search.google.com/search-console/). Choose **Add property > Domain**, enter `sampsonheavydiesel.com` without HTTPS, and copy its TXT verification value. Add it under Cloudflare **DNS > Records > Add record > TXT**, name `@`, then return to Google and verify. Keep the TXT record. [Ownership verification](https://support.google.com/webmasters/answer/9008080?hl=en).

Submit `https://sampsonheavydiesel.com/sitemap.xml` under **Sitemaps**. Inspect the homepage and important service pages with **URL Inspection > Test live URL**. Confirm Google can fetch them, sees the intended canonical and encounters no production noindex. Request indexing after checks pass. Use Google's [Rich Results Test](https://search.google.com/test/rich-results) for supported structured data; eligibility does not guarantee a special result.

Add the site to [Bing Webmaster Tools](https://www.bing.com/webmasters/) using its Search Console import option, then check ownership and sitemap. Keep search crawlers accessible. In Cloudflare **Security Settings > Configure AI bot policies**, keep **Search: Allow**. A Training block can also affect mixed purpose search crawlers under Cloudflare’s September 2026 policy; review that impact before enabling it. In **AI Crawl Control**, allow desired search crawlers such as OAI SearchBot where available and check request outcomes. Agent access governs assistants fetching pages on a visitor’s behalf. Confirm Googlebot and Bingbot access with real provider tools. No AI provider promises inclusion or first position. [Current AI bot policy](https://developers.cloudflare.com/bots/additional-configurations/block-ai-bots/).

Create a verified [Google Business Profile](https://business.google.com/) with accurate business details. If customers cannot visit, configure a service area business and hide its street address. Use genuine supported areas, not invented branches throughout Victoria. Postcode 3815 is confirmed; exact suburb, operating hours and customer access still need Clive's confirmation. These facts improve local setup but do not block hosting. [Service area rules](https://support.google.com/business/answer/9157481?hl=en).

## 6. Verify before announcing launch

Check each item on the live domain:

- Homepage and all service pages return 200. A made up path returns a real 404.
- HTTP and www lead to the matching HTTPS apex path, preserving query strings.
- Certificate is valid. Security headers appear once. Browser console has no CSP failures.
- Canonical URLs, social metadata, robots and sitemap use the purchased domain; production pages are indexable.
- Phone, SMS, navigation, postcode lookup, fonts and all 3D assemblies work on phone, tablet and desktop.
- GA4 stays unloaded after decline; acceptance records expected events; withdrawal stops optional collection. Cloudflare analytics receives visits without duplicate insertion.
- GitHub review remains nonindexed. Public alternate hosting and preview URLs are disabled or protected.

Existing automated checks validate the build. Live browser, DNS, certificate and provider dashboard checks still matter. Do not switch on aggressive challenges, country blocking or extra script optimization without testing customer access and the 3D viewer.

## 7. Maintain and recover

Keep GitHub history and a separate backup of repository, original artwork and DNS export. For a broken release, revert its GitHub commit and redeploy; Cloudflare's version rollback can restore a previous release while a fix is prepared. Verify the custom domain, redirects and certificate afterward. Do not delete the domain or DNS zone to roll back content.

Static asset requests are currently free and unlimited; optional products, build allowances and future server code have separate limits. Review billing before accepting upgrades. Domain renewal remains payable. [Hosting billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/).

Choose an external uptime service if independent alerts are wanted; none is created automatically. Check access, enquiries and backups weekly. Each month compare search clicks, useful queries, contact clicks and confirmed jobs. Improve pages from evidence rather than promising rankings or adding repetitive suburb pages.
