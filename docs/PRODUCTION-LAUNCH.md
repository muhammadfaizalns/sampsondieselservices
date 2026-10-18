# Production launch: sampsonheavydiesel.com

Updated 18 October 2026. **https://sampsonheavydiesel.com is live** on Cloudflare Pages project **sampson-heavy-diesel**. Automatic `main` deployment of commit `28fc732` passed. Live checks confirmed thirteen indexable pages, ten model assets, real 404 responses and security headers. HTTP, www and the production Pages hostname redirect to the HTTPS apex, preserving paths and query strings. GitHub Pages remains a separate, public, nonindexed review site. No service guarantees complete security, legal compliance or first place in search.

Confirmed dashboard settings: Full (strict) SSL, Always Use HTTPS, minimum TLS 1.2, TLS 1.3, WAF and DDoS protection. DNSSEC DS records propagated through two public resolvers, with DNS validation confirmed. Automatic preview branches are disabled; historical previews remain noindex. Cloudflare Web Analytics inserts exactly one beacon in the live browser. Its dashboard showed nine page views and nine visits during launch checks; these include test traffic. GA4 is off because its Measurement ID was explicitly deferred. Search Console and Bing ownership are not configured. Search Console opened under an existing Google account. The user chose Clive’s account for ownership and will switch accounts before verification.

## 1. Confirm ownership and account protection

Use accounts controlled by Clive or the business. Invite helpers separately; do not share passwords. Enable passkeys or two factor authentication for Cloudflare, GitHub and Google. Store recovery codes offline and confirm recovery email access. These owner settings still need verification.

Under **Domain Registration > Manage Domains > sampsonheavydiesel.com**, check contact information, auto renewal, payment method and transfer lock. Confirm domain status is **Active**. Keep Cloudflare nameservers. Accept provider terms personally when prompted.

DNSSEC is enabled, with DS propagation confirmed through `1.1.1.1` and `8.8.8.8`, and validation confirmed through Google DNS. Keep it enabled. Cloudflare Registrar manages the registrar side. Export DNS before changes; preserve mail and verification records. [DNSSEC guidance](https://developers.cloudflare.com/dns/dnssec/).

## 2. Verify Pages deployment

Open **Workers & Pages > sampson-heavy-diesel**. Connected repository is `muhammadfaizalns/sampsondieselservices`. GitHub access should be restricted to selected repositories.

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

The apex domain is associated with Pages and serving HTTPS. For recovery or another domain, use **Pages project > Custom domains > Set up a domain**, enter its hostname and confirm the proposed DNS record. The domain must be a zone in the same Cloudflare account. Wait for its domain and certificate to become active. Do not create only a manual CNAME: Pages must associate the hostname first. Preserve unrelated DNS records. [Custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/).

The configured `www` record is a proxied **A** record pointing to reserved placeholder `192.0.2.1`. Its verified redirect uses **Rules > Redirect Rules** with exact hostname matching:

```text
http.host eq "www.sampsonheavydiesel.com"
```

Use dynamic target `concat("https://sampsonheavydiesel.com", http.request.uri.path)`, status **301**, and **Preserve query string**. This address exists only to route requests through Cloudflare's redirect. Verify the matching path reaches the apex. [Redirect example](https://developers.cloudflare.com/rules/url-forwarding/examples/redirect-www-to-root/).

The account **Bulk Redirects** rule sends `sampson-heavy-diesel.pages.dev` to `https://sampsonheavydiesel.com` with a verified 301, preserving query string and path suffix. Keep preview access protection separate. Historical previews retain the production artifact's `noindex` headers. [Pages hostname redirect](https://developers.cloudflare.com/pages/how-to/redirect-to-custom-domain/).

## 4. Verify transport and security

Under **SSL/TLS**, Full (strict) is configured. Under **Edge Certificates**, **Always Use HTTPS**, minimum TLS **1.2** and TLS 1.3 are enabled. Keep these settings and monitor certificate validity. Pages supplies hosting without a separately managed origin server.

Production headers restrict script sources, framing, content types and browser features. Initial HSTS is one day on the apex. Leave dashboard HSTS disabled while the repository supplies it. Increase duration only after HTTPS works reliably; keep subdomain enforcement and preload off until all services have been assessed. [HSTS requirements](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/http-strict-transport-security/).

Review Cloudflare security events and managed protection settings. Avoid aggressive challenges, country blocks or script optimizers without testing genuine customers, crawlers and the 3D viewer. Account security, updates and monitoring remain ongoing work.

## 5. Enable analytics once

Cloudflare Web Analytics automatic setup for `sampsonheavydiesel.com` is complete. The live browser contains exactly one Cloudflare beacon and no Google scripts. Do not add another beacon through code or Pages. Dashboard delivery was verified during launch, with nine page views and nine visits shown, including test traffic. These reports measure visits and performance, not answered calls. [Web Analytics setup](https://developers.cloudflare.com/web-analytics/get-started/).

GA4 remains off until the owner supplies the deferred Measurement ID. Use the existing [Google Analytics property](https://analytics.google.com/). Confirm **Australia/Melbourne** reporting time, **AUD**, and the HTTPS apex web stream URL. Once received, add `GA4_MEASUREMENT_ID` under **Pages project > Settings > Variables and Secrets**, for **Production**, then redeploy. This public ID is not an account credential.

The consent module keeps Google code unloaded until acceptance. Visitors can decline or withdraw while contact links keep working. It records sanitized page views and `phone_click` / `sms_click` intent events. Use this installation only; do not duplicate it through Tag Manager or Zaraz. Turn **Enhanced measurement**, Google signals and advertising personalization off. Enable email and query parameter redaction as defence in depth. Confirm the privacy notice matches enabled providers. [GA4 setup](https://support.google.com/analytics/answer/9304153?hl=en).

Test consent and events in Realtime. Mark contact events as key events after they appear. Record answered enquiries and booked jobs separately. Never send names, message contents or other personal details as event parameters.

## 6. Connect search services

In [Google Search Console](https://search.google.com/search-console/), add Domain property `sampsonheavydiesel.com`. Add its TXT verification record in Cloudflare DNS, then verify and keep the record. Submit `https://sampsonheavydiesel.com/sitemap.xml`. Inspect homepage and service pages with **Test live URL**; confirm fetching, canonical and indexing eligibility before requesting indexing. [Verification](https://support.google.com/webmasters/answer/9008080?hl=en).

Add [Bing Webmaster Tools](https://www.bing.com/webmasters/) through Search Console import. Search Console and Bing ownership remain pending. Under Cloudflare **Configure AI bot policies**, Search, Agent and Training are currently **Allow**, with bot preference synchronization off. Keep desired search crawlers accessible. Training restrictions may affect mixed purpose crawlers under current policy; assess before enabling them. Check actual request outcomes. No AI provider guarantees inclusion or first position. [Current AI bot policy](https://developers.cloudflare.com/bots/additional-configurations/block-ai-bots/).

Create an owner controlled [Google Business Profile](https://business.google.com/) using confirmed details. Postcode **3815** is confirmed; exact suburb, hours and customer access are not. Hide the address if customers cannot visit. Do not invent branches or keyword additions to the business name. [Service area rules](https://support.google.com/business/answer/9157481?hl=en).

## 7. Check the live release and maintain it

Launch browser checks rendered the 3D canvas without warnings or errors. The 390 pixel mobile viewport had no horizontal overflow, and postcode 3815 returned its four locality matches. Future changes still require focused checks:

- Confirm homepage and service pages return 200; unknown paths return 404.
- Check HTTP and www redirects, valid certificate, security headers and browser CSP errors.
- Check production canonicals, social metadata, root robots.txt and sitemap; error and preview pages remain noindex.
- Test phone, SMS, navigation, lookup and models on phone, tablet and desktop.
- Verify analytics consent, provider delivery and no duplicate beacons.
- Keep preview access and the nonindexed GitHub review separate from production.

Keep repository, artwork and DNS backups. Revert a bad Git commit and let Pages rebuild, or use Pages deployment rollback while preparing a fix. Recheck the custom domain afterward. Do not delete the domain or zone to roll back content. Review current plan limits and billing before accepting upgrades. Domain renewal remains payable.

Confirm operator identity, ABN, hours, licence requirements and job terms with Clive. Hosting does not certify business compliance. Labour hire advertising remains withheld pending licensing clarification. Check uptime and enquiries regularly; compare search clicks, qualified enquiries and bookings. Use real job evidence rather than repetitive suburb pages.
