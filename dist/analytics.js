(function () {
  'use strict';

  var script = document.currentScript;
  var host = 'sampsonheavydiesel.com';
  var measurementId = script && script.dataset.ga4Id;
  if (!script || script.dataset.host !== host || window.location.hostname !== host ||
      window.location.protocol !== 'https:' || !/^G-[A-Z0-9]{10}$/.test(measurementId || '') ||
      document.getElementById('analytics-preferences-panel')) return;

  var storageKey = 'sampson.analyticsConsent.v1';
  var lifetime = 365 * 24 * 60 * 60 * 1000;
  var choice = null;
  var libraryState = 'idle';
  var configured = false;
  var pageViewed = false;
  var pendingEvents = [];
  var restoreFocus = false;
  var disableKey = 'ga-disable-' + measurementId;
  window[disableKey] = true;

  // Published canonical paths come from site content, never a visitor supplied URL.
  // This also prevents personal information in arbitrary 404 paths entering reports.
  var pagePath = '/';
  var canonical = document.querySelector('link[rel="canonical"]');
  try {
    var pageUrl = new URL(canonical && canonical.href, window.location.origin);
    if (canonical && pageUrl.origin === window.location.origin) pagePath = pageUrl.pathname;
  } catch (error) { /* Keep the safe homepage fallback. */ }
  var pageLocation = window.location.origin + pagePath;
  var pageReferrer = '';
  try {
    var referrer = new URL(document.referrer);
    if (referrer.protocol === 'https:' || referrer.protocol === 'http:') pageReferrer = referrer.origin;
  } catch (error) { /* Empty and invalid referrers need no reporting. */ }

  function readChoice() {
    try {
      var saved = JSON.parse(window.localStorage.getItem(storageKey));
      if (saved && saved.version === 1 &&
          (saved.choice === 'accepted' || saved.choice === 'declined') &&
          Number.isFinite(saved.expiresAt) && saved.expiresAt > Date.now() &&
          saved.expiresAt <= Date.now() + lifetime + 60000) return saved.choice;
      window.localStorage.removeItem(storageKey);
    } catch (error) { /* Storage can be blocked. The current page still works. */ }
    return null;
  }

  function saveChoice(value) {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({
        version: 1, choice: value, expiresAt: Date.now() + lifetime
      }));
    } catch (error) { /* Do not make analytics or contact depend on storage. */ }
  }

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  var panel = element('section', 'analytics-panel');
  panel.id = 'analytics-preferences-panel';
  panel.hidden = true;
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', 'analytics-preferences-title');
  var title = element('h2', 'analytics-title', 'Your analytics choice');
  title.id = 'analytics-preferences-title';
  title.tabIndex = -1;
  var description = element('p', 'analytics-description',
    'Optional Google Analytics helps us understand visits and contact button use. It stays off unless you accept. Calling and texting always work.');
  var privacy = element('a', 'analytics-privacy', 'Read our privacy information');
  privacy.href = '/privacy/';
  var status = element('p', 'analytics-status');
  var actions = element('div', 'analytics-actions');
  var accept = element('button', 'analytics-choice', 'Accept analytics');
  var decline = element('button', 'analytics-choice', 'Decline analytics');
  accept.type = decline.type = 'button';
  actions.append(accept, decline);
  var close = element('button', 'analytics-close', 'Close preferences');
  close.type = 'button';
  panel.append(title, description, privacy, status, actions, close);
  document.body.append(panel);

  var preferences = element('button', 'analytics-preferences', 'Analytics preferences');
  preferences.type = 'button';
  preferences.setAttribute('aria-controls', panel.id);
  preferences.setAttribute('aria-expanded', 'false');
  var footer = document.querySelector('.footer-links') || document.querySelector('footer');
  if (footer) footer.append(preferences);

  function updateStatus() {
    status.textContent = choice === 'accepted' ? 'Optional analytics is on.' : 'Optional analytics is off.';
    close.hidden = choice === null;
  }

  function hidePanel() {
    panel.hidden = true;
    preferences.setAttribute('aria-expanded', 'false');
    if (restoreFocus) preferences.focus();
    restoreFocus = false;
  }

  function queue() {
    window.dataLayer.push(arguments);
  }

  function initialiseQueue() {
    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== 'function') window.gtag = queue;
    window.gtag('consent', 'default', {
      analytics_storage: 'denied', ad_storage: 'denied',
      ad_user_data: 'denied', ad_personalization: 'denied'
    });
    window.gtag('set', 'ads_data_redaction', true);
    window.gtag('set', 'url_passthrough', false);
  }

  function send(name, parameters) {
    if (choice !== 'accepted' || window[disableKey] || libraryState !== 'ready') return;
    window.gtag('event', name, parameters);
  }

  function activate() {
    if (choice !== 'accepted' || libraryState !== 'ready') return;
    window[disableKey] = false;
    window.gtag('consent', 'update', {
      analytics_storage: 'granted', ad_storage: 'denied',
      ad_user_data: 'denied', ad_personalization: 'denied'
    });
    if (!configured) {
      window.gtag('js', new Date());
      window.gtag('config', measurementId, {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        cookie_flags: 'SameSite=Lax;Secure',
        cookie_expires: 31536000,
        cookie_update: false,
        page_location: pageLocation,
        page_referrer: pageReferrer
      });
      configured = true;
    }
    if (!pageViewed) {
      pageViewed = true;
      send('page_view', { page_location: pageLocation, page_referrer: pageReferrer });
    }
    var events = pendingEvents;
    pendingEvents = [];
    events.forEach(function (event) { send(event.name, event.parameters); });
  }

  function enable() {
    if (choice !== 'accepted') return;
    if (libraryState === 'ready') return activate();
    if (libraryState === 'loading') return;
    initialiseQueue();
    libraryState = 'loading';
    var library = document.createElement('script');
    library.async = true;
    library.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
    library.referrerPolicy = 'strict-origin';
    library.onload = function () {
      libraryState = 'ready';
      activate();
    };
    library.onerror = function () {
      libraryState = 'idle';
      pendingEvents = [];
      library.remove();
    };
    document.head.append(library);
  }

  function clearAnalyticsCookies() {
    var paths = ['/'];
    var prefix = '';
    window.location.pathname.split('/').filter(Boolean).forEach(function (part) {
      prefix += '/' + part;
      paths.push(prefix, prefix + '/');
    });
    var names = document.cookie.split(';').map(function (cookie) {
      return cookie.split('=')[0].trim();
    }).filter(function (name) { return /^_ga(?:_|$)/.test(name); });
    names.forEach(function (name) {
      paths.forEach(function (path) {
        ['', host, '.' + host].forEach(function (domain) {
          document.cookie = name + '=; Max-Age=0; Path=' + path +
            (domain ? '; Domain=' + domain : '') + '; SameSite=Lax; Secure';
        });
      });
    });
  }

  function disable() {
    // Google documents this flag as stopping Analytics data collection. Do not
    // send a denied consent ping after withdrawal: no Google command runs here.
    window[disableKey] = true;
    pendingEvents = [];
    clearAnalyticsCookies();
  }

  function applyChoice(value, persist) {
    choice = value;
    if (persist) saveChoice(value);
    updateStatus();
    if (value === 'accepted') enable();
    else disable();
  }

  accept.addEventListener('click', function () { applyChoice('accepted', true); hidePanel(); });
  decline.addEventListener('click', function () { applyChoice('declined', true); hidePanel(); });
  close.addEventListener('click', hidePanel);
  preferences.addEventListener('click', function () {
    restoreFocus = true;
    updateStatus();
    panel.hidden = false;
    preferences.setAttribute('aria-expanded', 'true');
    title.focus();
  });
  panel.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && choice !== null) hidePanel();
  });

  function placement(link) {
    var regions = [
      ['.mobile-contact', 'mobile'], ['header', 'header'], ['.hero', 'hero'],
      ['#contact', 'contact'], ['#clive', 'profile'], ['.breakdown', 'breakdown'],
      ['.coverage', 'coverage'], ['.side-card', 'service_sidebar'], ['footer', 'footer']
    ];
    for (var index = 0; index < regions.length; index++) {
      if (link.closest(regions[index][0])) return regions[index][1];
    }
    return 'content';
  }

  document.addEventListener('click', function (event) {
    if (choice !== 'accepted' || event.defaultPrevented || (event.button && event.button !== 0)) return;
    var target = event.target;
    var link = target && typeof target.closest === 'function' && target.closest('a[href]');
    if (!link) return;
    var href = link.getAttribute('href') || '';
    var name = /^tel:/i.test(href) ? 'phone_click' : /^sms:/i.test(href) ? 'sms_click' : null;
    if (!name) return;
    var parameters = { page_path: pagePath, contact_placement: placement(link) };
    if (libraryState === 'ready') send(name, parameters);
    else if (pendingEvents.length < 10) pendingEvents.push({ name: name, parameters: parameters });
  });

  window.addEventListener('storage', function (event) {
    if (event.key !== storageKey && event.key !== null) return;
    var saved = readChoice();
    applyChoice(saved, false);
    if (saved !== null) hidePanel();
    else panel.hidden = false;
  });

  choice = readChoice();
  applyChoice(choice, false);
  if (choice === null) panel.hidden = false;
}());
