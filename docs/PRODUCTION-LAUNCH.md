# Production launch: sampsonheavydiesel.com

Updated 18 October 2026. Target: **https://sampsonheavydiesel.com**. Cloudflare Pages Git deployment has been submitted for project **sampson-heavy-diesel**; custom domain and live checks are still pending. GitHub Pages remains a separate, public, nonindexed review site. The repository provides the static build, security headers, canonical URLs and sitemap. Cloudflare provides hosting, DNS and certificates. No service guarantees complete security, legal compliance or first place in search.

## 1. Confirm ownership and account protection

Use accounts controlled by Clive or the business. Invite helpers separately; do not share passwords. Enable passkeys or two factor authentication for Cloudflare, GitHub and Google. Store recovery codes offline and confirm recovery email access. These owner settings still need verification.

Under **Domain Registration > Manage Domains > sampsonheavydiesel.com**, check contact information, auto renewal, payment method and transfer lock. Confirm domain status is **Active**. Keep Cloudflare nameservers. Accept provider terms personally when prompted.

Under **DNS > Settings > DNSSEC**, enable DNSSEC if disabled and verify activation. Cloudflare Registrar manages the registrar side. Export DNS before changes; preserve mail and verification records. [DNSSEC guidance](https://developers.cloudflare.com/dns/dnssec/).

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

Wait for successful deployment. `wrangler.jsonc` identifies this Pages project and its output directory; domain association is a separate dashboard step. Pushes to `main` trigger production builds. Disable unnecessary preview branches, or protect previews with Cloudflare Access. Preview `noindex` headers prevent indexing, not public access. [Build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/), [Wrangler configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/).

## 3. Attach the purchased domain

Open **Pages project > Custom domains > Set up a domain**. Enter `sampsonheavydiesel.com` and confirm the proposed DNS record. The domain must be a zone in the same Cloudflare account. Wait for the domain and certificate to become active. Do not create only a manual CNAME: Pages must associate the hostname first. Preserve unrelated DNS records. [Custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/).

After apex HTTPS works, configure `www`. If no existing service needs it, add a proxied **A** record named `www` pointing to reserved placeholder `192.0.2.1`. Under **Rules > Redirect Rules**, create a rule matching:

```text
http.host eq "www.sampsonheavydiesel.com"
```

Use dynamic target `concat("https://sampsonheavydiesel.com", http.request.uri.path)`, status **301**, and **Preserve query string**. This address exists only to route requests through Cloudflare's redirect. Verify the matching path reaches the apex. [Redirect example](https://developers.cloudflare.com/rules/url-forwarding/examples/redirect-www-to-root/).

Redirect `sampson-heavy-diesel.pages.dev` to `https://sampsonheavydiesel.com` through account **Bulk Redirects** after apex activation. Preserve query string, enable subpath matching and preserve path suffix. Keep preview access protection separate. The production artifact supplies `noindex` headers for Pages hostnames. [Pages hostname redirect](https://developers.cloudflare.com/pages/how-to/redirect-to-custom-domain/).

## 4. Verify transport and security

Under **SSL/TLS > Edge Certificates**, enable **Always Use HTTPS**, set minimum TLS to **1.2**, and keep TLS 1.3 enabled. Check certificate validity before announcing launch. Pages supplies hosting without a separately managed origin server.

Production headers restrict script sources, framing, content types and browser features. Initial HSTS is one day on the apex. Leave dashboard HSTS disabled while the repository supplies it. Increase duration only after HTTPS works reliably; keep subdomain enforcement and preload off until all services have been assessed. [HSTS requirements](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/http-strict-transport-security/).

Review Cloudflare security events and managed protection settings. Avoid aggressive challenges, country blocks or script optimizers without testing genuine customers, crawlers and the 3D viewer. Account security, updates and monitoring remain ongoing work.

## 5. Enable analytics once

In **Web Analytics > Add a site**, choose `sampsonheavydiesel.com` and automatic setup. Do not add a second beacon through code or Pages. Check a real visit reaches the dashboard. These reports measure visits and performance, not answered calls. [Web Analytics setup](https://developers.cloudflare.com/web-analytics/get-started/).

Use the existing [Google Analytics property](https://analytics.google.com/). Confirm **Australia/Melbourne** reporting time, **AUD**, and the HTTPS apex web stream URL. Measurement ID is still pending. Once received, add `GA4_MEASUREMENT_ID` under **Pages project > Settings > Variables and Secrets**, for **Production**, then redeploy. This public ID is not an account credential.

The consent module keeps Google code unloaded until acceptance. Visitors can decline or withdraw while contact links keep working. It records sanitized page views and `phone_click` / `sms_click` intent events. Use this installation only; do not duplicate it through Tag Manager or Zaraz. Turn **Enhanced measurement**, Google signals and advertising personalization off. Enable email and query parameter redaction as defence in depth. Confirm the privacy notice matches enabled providers. [GA4 setup](https://support.google.com/analytics/answer/9304153?hl=en).

Test consent and events in Realtime. Mark contact events as key events after they appear. Record answered enquiries and booked jobs separately. Never send names, message contents or other personal details as event parameters.

## 6. Connect search services

In [Google Search Console](https://search.google.com/search-console/), add Domain property `sampsonheavydiesel.com`. Add its TXT verification record in Cloudflare DNS, then verify and keep the record. Submit `https://sampsonheavydiesel.com/sitemap.xml`. Inspect homepage and service pages with **Test live URL**; confirm fetching, canonical and indexing eligibility before requesting indexing. [Verification](https://support.google.com/webmasters/answer/9008080?hl=en).

Add [Bing Webmaster Tools](https://www.bing.com/webmasters/) through Search Console import. Verify ownership and sitemap. Under Cloudflare **Configure AI bot policies**, keep **Search: Allow**. Training restrictions may affect mixed purpose crawlers under current policy; assess before enabling them. Allow desired search crawlers in **AI Crawl Control** and verify actual request outcomes. No AI provider guarantees inclusion or first position. [Current AI bot policy](https://developers.cloudflare.com/bots/additional-configurations/block-ai-bots/).

Create an owner controlled [Google Business Profile](https://business.google.com/) using confirmed details. Postcode **3815** is confirmed; exact suburb, hours and customer access are not. Hide the address if customers cannot visit. Do not invent branches or keyword additions to the business name. [Service area rules](https://support.google.com/business/answer/9157481?hl=en).

## 7. Check the live release and maintain it

- Confirm homepage and service pages return 200; unknown paths return 404.
- Check HTTP and www redirects, valid certificate, security headers and browser CSP errors.
- Check production canonicals, social metadata, root robots.txt and sitemap; error and preview pages remain noindex.
- Test phone, SMS, navigation, lookup and models on phone, tablet and desktop.
- Verify analytics consent, provider delivery and no duplicate beacons.
- Keep preview access and the nonindexed GitHub review separate from production.

Keep repository, artwork and DNS backups. Revert a bad Git commit and let Pages rebuild, or use Pages deployment rollback while preparing a fix. Recheck the custom domain afterward. Do not delete the domain or zone to roll back content. Review current plan limits and billing before accepting upgrades. Domain renewal remains payable.

Confirm operator identity, ABN, hours, licence requirements and job terms with Clive. Hosting does not certify business compliance. Labour hire advertising remains withheld pending licensing clarification. Check uptime and enquiries regularly; compare search clicks, qualified enquiries and bookings. Use real job evidence rather than repetitive suburb pages.
