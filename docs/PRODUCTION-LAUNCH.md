# Production launch: sampsonheavydiesel.com

Updated 18 October 2026. **https://sampsonheavydiesel.com is live** on Cloudflare Pages project **sampson-heavy-diesel**. Automatic `main` deployment of commit `18e14f9` passed. Live checks confirmed thirteen indexable pages, ten model assets, real 404 responses and security headers. HTTP, www and the production Pages hostname redirect to the HTTPS apex, preserving paths and query strings. GitHub Pages remains a separate, public, nonindexed review site. Security, legal compliance and rankings cannot be guaranteed.

Confirmed: Full (strict) SSL, HTTPS enforcement, TLS 1.2 minimum, TLS 1.3, WAF, DDoS protection and validated DNSSEC. Automatic preview branches are disabled; historical previews remain noindex. Cloudflare analytics works. GA4 consent and withdrawal checks passed; Realtime confirms received test visits. Clarity replay is separately consented and a masked test recording was received. Live phone and SMS delivery remains untested. Google and Bing ownership are verified, sitemaps accepted and indexing unconfirmed. Search generative AI remains **Include**. Google Business Profile awaits the owner's verification video.

## 1. Confirm ownership and account protection

Use accounts controlled by Clive or the business. Invite helpers separately; do not share passwords. Enable passkeys or two factor authentication for Cloudflare, GitHub and Google. Keep recovery codes offline and confirm recovery access. On 18 October 2026, Cloudflare showed two factor authentication as **Inactive**. The owner must enrol a security key or authenticator personally and retain recovery codes privately. GitHub and Google account factors and recovery access remain unverified. Account protection does not add visitor page load work.

Registrar review confirmed **Active** status, automatic renewal enabled, WHOIS redaction enabled and transfer unlocking disabled because registration is within its first 60 days. Keep transfer protection enabled after that period. Contact accuracy, payment validity and recovery access still need owner confirmation. Keep Cloudflare nameservers. Accept provider terms personally.

DNSSEC is enabled, with DS propagation confirmed through `1.1.1.1` and `8.8.8.8`, and validation confirmed through Google DNS. Keep it enabled. Cloudflare Registrar manages the registrar side. Export DNS before changes; preserve mail and verification records. [DNSSEC guidance](https://developers.cloudflare.com/dns/dnssec/).

## 2. Verify Pages deployment

Open **Workers & Pages > sampson-heavy-diesel**. Connected repository is `muhammadfaizalns/sampsondieselservices`. Restrict GitHub access to this repository.

| Setting | Value |
| --- | --- |
| Framework | None |
| Production branch | `main` |
| Root directory | Repository root |
| Build command | `python3 scripts/prepare-launch.py` |
| Build output directory | `_production` |
| Build variable | `NODE_VERSION=22` |
| Build variable | `PYTHON_VERSION=3.13` |

The production deployment passed. `wrangler.jsonc` identifies this Pages project and its output directory; domain association is a separate dashboard step. Pushes to `main` trigger production builds. Preview branch deployment is set to **None**. Historical preview `noindex` headers prevent indexing, not public access; use Cloudflare Access if privacy is needed. [Build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/), [Wrangler configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/).

## 3. Attach the purchased domain

The apex domain is associated with Pages and serving HTTPS. For recovery, use **Pages project > Custom domains > Set up a domain** and confirm DNS. Keep the zone in this account; wait for activation and certificate. Do not create only a manual CNAME: Pages must associate the hostname first. Preserve unrelated DNS records. [Custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/).

The configured `www` record is a proxied **A** record pointing to reserved placeholder `192.0.2.1`. Its verified redirect uses **Rules > Redirect Rules** with exact hostname matching:

```text
http.host eq "www.sampsonheavydiesel.com"
```

Use dynamic target `concat("https://sampsonheavydiesel.com", http.request.uri.path)`, status **301**, and **Preserve query string**. The placeholder routes requests through the verified redirect. [Redirect example](https://developers.cloudflare.com/rules/url-forwarding/examples/redirect-www-to-root/).

The account **Bulk Redirects** rule sends `sampson-heavy-diesel.pages.dev` to `https://sampsonheavydiesel.com` with a verified 301, preserving query string and path suffix. Keep preview access protection separate. Historical previews retain the production artifact's `noindex` headers. [Pages hostname redirect](https://developers.cloudflare.com/pages/how-to/redirect-to-custom-domain/).

## 4. Verify transport and security

Under **SSL/TLS**, Full (strict) is configured. Under **Edge Certificates**, **Always Use HTTPS**, minimum TLS **1.2** and TLS 1.3 are enabled. Keep these settings and monitor certificate validity. Pages supplies hosting without a separately managed origin server.

Production headers restrict script sources, framing, content types and browser features. Initial HSTS is one day on the apex. Leave dashboard HSTS disabled while the repository supplies it. Increase duration only after HTTPS works reliably; keep subdomain enforcement and preload off until all services have been assessed. [HSTS requirements](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/http-strict-transport-security/).

Review Cloudflare security events and managed protection settings. Avoid aggressive challenges, country blocks or script optimizers without testing genuine customers, crawlers and the 3D viewer. Account security, updates and monitoring remain ongoing work.

## 5. Enable analytics once

Cloudflare Web Analytics automatic setup for `sampsonheavydiesel.com` is complete. Preactivation checks found one Cloudflare beacon and no Google scripts. Do not add another beacon through code or Pages. Dashboard delivery was verified during launch, with nine page views and nine visits shown, including test traffic. These reports measure visits and performance, not answered calls. [Web Analytics setup](https://developers.cloudflare.com/web-analytics/get-started/).

A new [Google Analytics](https://analytics.google.com/) account was created under Clive with authorized Australian terms: account `412403946`, property `559433691`, stream `16151141916`, Measurement ID `G-S87DLVT21V`. Settings: Melbourne, AUD, Auto & Vehicles, confirmed 1 to 10 staff, leads and traffic objectives. Four optional data sharing choices and optional emails are off.

Enhanced measurement, Google signals and user provided data are off. Email redaction and fourteen query keys are saved: `email`, `phone`, `mobile`, `name`, `firstname`, `lastname`, `surname`, `address`, `postcode`, `suburb`, `q`, `query`, `search`, `message`. Advertising personalization is disabled across all 307 regions. User/event retention is two months; reset on activity is off. Phone and SMS key events have no monetary value and count once per session. Event scoped **Contact placement** maps to `contact_placement`.

Production `18e14f9` passed 37 Python and 11 Node tests, with GA4 consent required and zero search audit issues. `scripts/production-config.json` supplies the public ID when its environment key is absent; environment overrides, blank disable and nonmain preview suppression work. Live fresh/declined visits loaded no remote Google script; acceptance and accepted reload loaded one, without browser errors. Withdrawal followed by reload restored zero Google scripts. Realtime showed one active test visitor and received page views plus basic session events. No real call or SMS was invoked, so contact event delivery remains untested. Use one installation; contact events do not prove bookings. To disable reliably, set the public config ID to an empty string and deploy; dashboard text values were not reaching the build during setup. [GA4 setup](https://support.google.com/analytics/answer/9304153?hl=en).

[Microsoft Clarity](https://clarity.microsoft.com/) project `yzgu5ctzhl` now belongs solely to Clive after authorized terms acceptance. Strict masking is selected, Cookies are off for global Consent Mode, bot detection is on and Copilot is off. Advertising and GA integrations remain disconnected. Separate replay permission is required; older GA consent never grants it. Preferences expire after 270 days. Whole page and lookup masking apply before load, with unsafe URL/referrer suppression. Withdrawal stops capture, clears accessible cookies and reloads; prior activity may finish processing. Microsoft’s broader independent processing and data reuse terms are disclosed. Production `8315a4a` passed 43 Python and 29 Node tests and the search audit. Live checks confirmed independent permissions, no tags before consent or after refusal, replay withdrawal, query URL blocking and mobile fit. Masked lookup still returned four 3815 results; Clarity’s live player received the test session with masked text. Standard dashboards and heatmaps may process later. [Consent Mode](https://learn.microsoft.com/en-us/clarity/setup-and-installation/consent-mode), [masking](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-masking).

The current consent notice uses two layers. The compact first layer discloses both providers, masked replay and Microsoft’s independent product and advertising purposes. Accept all and Reject optional have equal styling; Settings and privacy information remain visible. Settings contains the independent provider controls and status, with footer access for later changes. Back or Escape does not save unsaved checkbox edits. No grant, migration, retention, masking or withdrawal rules changed. Asset query version 3 keeps the matching script and stylesheet together. The release passed 43 Python and 34 Node tests, a clean search artifact audit, keyboard checks, and narrow phone and short landscape layout checks. Phone and SMS contact delivery still needs an owner test.

## 6. Connect search services

On 18 October 2026, [Google Search Console](https://search.google.com/search-console/) verified Domain property `sampsonheavydiesel.com` in Clive Sampson's account using one Cloudflare TXT record. Keep that DNS record; do not copy its token into the repository. Sitemap `https://sampsonheavydiesel.com/sitemap.xml` shows **Success**, with thirteen discovered pages and zero videos. Homepage and `/services/mobile-truck-mechanic/` passed explicit live tests. Three indexing requests, also including `/services/`, entered Google's priority queue after eligibility checks. Mobile inspection confirmed smartphone access, successful fetch, indexing allowed, matching canonical and one valid breadcrumb. Initial status was **Discovered, currently not indexed**; queued requests do not confirm indexing. [Verification](https://support.google.com/webmasters/answer/9008080?hl=en).

[Bing Webmaster Tools](https://www.bing.com/webmasters/) confirms Clive as the sole administrator, verified by DNS CNAME. Its accepted sitemap is **Processing**: one known sitemap, zero errors/warnings; URLs not yet read. No Search Console access was granted. Keep verification DNS. Under Cloudflare **Configure AI bot policies**, Search, Agent and Training are currently **Allow**, with bot preference synchronization off. Keep desired search crawlers accessible. Training restrictions may affect mixed purpose crawlers under current policy; assess before enabling them. Check actual request outcomes. No AI provider guarantees inclusion or first position. [Current AI bot policy](https://developers.cloudflare.com/bots/additional-configurations/block-ai-bots/).

Basic [Google Business Profile](https://business.google.com/) is created in Clive's account after authorized terms acceptance: exact business name, **Diesel engine repair service**, Bunyip VIC service area, phone and website. Customers cannot visit; no location is public. Private address went only to Google's hidden verification and must never enter the repository or website. No hours, chat or marketing opt in were added. Google requires the owner to record a real business verification video; setup is left at **Start recording**, unverified and not publicly visible. [Service area rules](https://support.google.com/business/answer/9157481?hl=en).

## 7. Check the live release and maintain it

Launch browser checks rendered the 3D canvas without warnings or errors. The 390 pixel mobile viewport had no horizontal overflow, and postcode 3815 returned its four locality matches. Future changes still require focused checks:

- Confirm homepage and service pages return 200; unknown paths return 404.
- Check HTTP and www redirects, valid certificate, security headers and browser CSP errors.
- Check production canonicals, social metadata, root robots.txt and sitemap; error and preview pages remain noindex.
- Test phone, SMS, navigation, lookup and models on phone, tablet and desktop.
- Verify analytics consent, delivery and no duplicate beacons.
- Keep preview access and the nonindexed GitHub review separate from production.

Keep repository, artwork and DNS backups. Revert a bad Git commit and let Pages rebuild, or use Pages deployment rollback while preparing a fix. Recheck the custom domain afterward. Do not delete the domain or zone to roll back content. Check plan limits before upgrades; domain renewal remains payable.

Confirm operator identity, ABN, hours, licence requirements and job terms with Clive. Hosting does not certify business compliance. Labour hire advertising remains withheld pending licensing clarification. Compare search clicks, qualified enquiries and bookings. Use real job evidence rather than repetitive suburb pages.
