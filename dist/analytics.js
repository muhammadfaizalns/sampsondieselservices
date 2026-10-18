(function () {
  'use strict';

  var script = document.currentScript;
  var host = 'sampsonheavydiesel.com';
  if (!script || script.dataset.host !== host || window.location.hostname !== host ||
      window.location.protocol !== 'https:' || document.getElementById('analytics-preferences-panel')) return;
  var measurementId = /^G-[A-Z0-9]{10}$/.test(script.dataset.ga4Id || '') ? script.dataset.ga4Id : null;
  var clarityId = /^[a-z0-9]{1,64}$/.test(script.dataset.clarityId || '') ? script.dataset.clarityId : null;
  if (!measurementId && !clarityId) return;

  var storageKey = 'sampson.analyticsConsent.v2';
  var legacyKey = 'sampson.analyticsConsent.v1';
  var refusalCookie = 'sampson_optional_refusal';
  var forcedOff = window.location.hash === '#optional-analytics-off';
  var persistenceWarning = forcedOff ? 'Your browser could not save your choice. Optional analytics is off on this page. Enable browser storage before choosing again.' : '';
  var lifetime = 270 * 24 * 60 * 60 * 1000;
  var legacyLifetime = 365 * 24 * 60 * 60 * 1000;
  var choices = { ga4: null, clarity: null };
  var libraryState = 'idle';
  var clarityState = 'idle';
  var clarityLibrary = null;
  var reloading = false;
  var configured = false;
  var pageViewed = false;
  var pendingEvents = [];
  var restoreFocus = false;
  var disableKey = measurementId && 'ga-disable-' + measurementId;
  if (disableKey) window[disableKey] = true;

  var pagePath = '/';
  var canonical = document.querySelector('link[rel="canonical"]');
  var canonicalUrl = null;
  try {
    var parsedCanonical = new URL(canonical && canonical.href, window.location.origin);
    if (canonical && parsedCanonical.origin === window.location.origin) {
      canonicalUrl = parsedCanonical;
      pagePath = parsedCanonical.pathname;
    }
  } catch (error) { /* Keep the safe GA homepage fallback. */ }
  var pageLocation = window.location.origin + pagePath;
  var pageReferrer = '';
  try {
    var referrer = new URL(document.referrer);
    if (referrer.protocol === 'https:' || referrer.protocol === 'http:') pageReferrer = referrer.origin;
  } catch (error) { /* Empty and invalid referrers need no GA reporting. */ }

  var publicPaths = [];
  try {
    var paths = JSON.parse(script.dataset.publicPaths || '[]');
    if (Array.isArray(paths) && paths.length && paths.every(function (path) {
      return typeof path === 'string' && path.charAt(0) === '/' && !/[?#\\]/.test(path);
    })) publicPaths = paths;
  } catch (error) { /* Clarity stays off without the published path allowlist. */ }

  function safeReplayUrl() {
    if (!canonicalUrl || canonicalUrl.search || canonicalUrl.hash ||
        canonicalUrl.pathname !== window.location.pathname ||
        publicPaths.indexOf(window.location.pathname) === -1 ||
        /^\/404(?:\.html|\/|$)/.test(window.location.pathname) ||
        window.location.search || window.location.hash) return false;
    if (!document.referrer) return true;
    try {
      var previous = new URL(document.referrer);
      if ((previous.protocol !== 'https:' && previous.protocol !== 'http:') ||
          previous.username || previous.password || previous.search || previous.hash) return false;
      return previous.origin === window.location.origin ? publicPaths.indexOf(previous.pathname) !== -1 : previous.pathname === '/';
    } catch (error) { return false; }
  }

  function validChoice(value) {
    return value === null || value === 'accepted' || value === 'declined';
  }

  function readChoice() {
    if (forcedOff) return { ga4: 'declined', clarity: 'declined' };
    try {
      var raw = window.localStorage.getItem(storageKey);
      if (raw !== null) {
        var saved = JSON.parse(raw);
        if (saved && saved.version === 2 && validChoice(saved.ga4) && validChoice(saved.clarity) &&
            Number.isFinite(saved.expiresAt) && saved.expiresAt > Date.now() &&
            saved.expiresAt <= Date.now() + lifetime + 60000) {
          // Probe the existing record without extending consent. Readable but
          // unwritable accepted records must not silently restart a recorder.
          window.localStorage.setItem(storageKey, raw);
          return restrictChoice({ ga4: saved.ga4, clarity: saved.clarity });
        }
        window.localStorage.removeItem(storageKey);
        return { ga4: null, clarity: null };
      }
      var legacy = JSON.parse(window.localStorage.getItem(legacyKey));
      if (legacy && legacy.version === 1 && (legacy.choice === 'accepted' || legacy.choice === 'declined') &&
          Number.isFinite(legacy.expiresAt) && legacy.expiresAt <= Date.now() + legacyLifetime + 60000) {
        // Preserve only GA consent and cap its original twelve month term at nine months.
        var cappedExpiry = legacy.expiresAt - legacyLifetime + lifetime;
        var migrated = { version: 2, ga4: cappedExpiry > Date.now() ? legacy.choice : null,
          clarity: null, expiresAt: cappedExpiry > Date.now() ? cappedExpiry : Date.now() + lifetime };
        window.localStorage.setItem(storageKey, JSON.stringify(migrated));
        window.localStorage.removeItem(legacyKey);
        return restrictChoice({ ga4: migrated.ga4, clarity: null });
      }
      window.localStorage.removeItem(legacyKey);
    } catch (error) { /* A blocked browser asks again on the next visit. */ }
    return restrictChoice({ ga4: null, clarity: null });
  }

  function cookieRefusals() {
    try {
      var entry = document.cookie.split(';').map(function (value) { return value.trim(); })
        .find(function (value) { return value.indexOf(refusalCookie + '=') === 0; });
      return entry ? entry.slice(refusalCookie.length + 1).split('.') : [];
    } catch (error) { return []; }
  }

  function restrictChoice(next) {
    var refused = cookieRefusals();
    return { ga4: refused.indexOf('ga4') !== -1 ? 'declined' : next.ga4,
      clarity: refused.indexOf('clarity') !== -1 ? 'declined' : next.clarity };
  }

  function saveRefusals(next) {
    var refused = [];
    if (next.ga4 === 'declined') refused.push('ga4');
    if (next.clarity === 'declined') refused.push('clarity');
    try {
      document.cookie = refusalCookie + '=' + refused.join('.') + '; Max-Age=' +
        (refused.length ? lifetime / 1000 : 0) + '; Path=/; SameSite=Lax; Secure';
      return cookieRefusals().join('.') === refused.join('.');
    } catch (error) { return false; }
  }

  function saveChoice() {
    var saved = false;
    var cleared = false;
    try {
      var record = JSON.stringify({ version: 2, ga4: choices.ga4,
        clarity: choices.clarity, expiresAt: Date.now() + lifetime });
      window.localStorage.setItem(storageKey, record);
      saved = window.localStorage.getItem(storageKey) === record;
      window.localStorage.removeItem(legacyKey);
    } catch (error) { /* Try to remove stale grants before a clean reload. */ }
    if (!saved) {
      try {
        window.localStorage.removeItem(storageKey);
        window.localStorage.removeItem(legacyKey);
        cleared = window.localStorage.getItem(storageKey) === null && window.localStorage.getItem(legacyKey) === null;
      } catch (error) { /* A restrictive cookie can still preserve refusal. */ }
    }
    var cookieSaved = saveRefusals(choices);
    if (!saved) persistenceWarning = 'Some choices could not be saved. Refusals remain active and this browser may ask again.';
    return { saved: saved, cleared: cleared, cookieSaved: cookieSaved };
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
  var title = element('h2', 'analytics-title', 'Your privacy choices');
  title.id = 'analytics-preferences-title';
  title.tabIndex = -1;
  var description = element('p', 'analytics-description',
    'Choose optional tools separately. Both stay off until you allow them. Calling and texting always work.');
  var fields = element('div', 'analytics-options');
  function option(id, label, explanation) {
    var row = element('label', 'analytics-option');
    var input = element('input');
    input.type = 'checkbox';
    input.id = id;
    var copy = element('span');
    copy.append(element('strong', '', label), element('span', 'analytics-option-detail', explanation));
    row.append(input, copy);
    fields.append(row);
    return input;
  }
  var gaInput = measurementId && option('analytics-ga4-choice', 'Google Analytics',
    'Counts visits and use of call and text links.');
  var clarityInput = clarityId && option('analytics-clarity-choice', 'Microsoft Clarity session replay',
    'Records masked session replays, clicks and heatmaps to show how this website is used.');
  var privacy = element('a', 'analytics-privacy', 'Read our privacy information');
  privacy.href = '/privacy/';
  var status = element('p', 'analytics-status');
  status.setAttribute('aria-live', 'polite');
  var actions = element('div', 'analytics-actions');
  var accept = element('button', 'analytics-choice', 'Accept all');
  var decline = element('button', 'analytics-choice', 'Decline all');
  var save = element('button', 'analytics-choice analytics-save', 'Save choices');
  accept.type = decline.type = save.type = 'button';
  actions.append(accept, decline, save);
  var close = element('button', 'analytics-close', 'Close preferences');
  close.type = 'button';
  panel.append(title, description, fields, privacy, status, actions, close);
  document.body.append(panel);

  var preferences = element('button', 'analytics-preferences', 'Analytics preferences');
  preferences.type = 'button';
  preferences.setAttribute('aria-controls', panel.id);
  preferences.setAttribute('aria-expanded', 'false');
  var footer = document.querySelector('.footer-links') || document.querySelector('footer');
  if (footer) footer.append(preferences);

  function needsChoice() {
    return (measurementId && choices.ga4 === null) || (clarityId && choices.clarity === null);
  }

  function updateStatus() {
    if (gaInput) gaInput.checked = choices.ga4 === 'accepted';
    if (clarityInput) clarityInput.checked = choices.clarity === 'accepted';
    var text = [];
    if (measurementId) text.push('Google Analytics is ' + (choices.ga4 === 'accepted' ? 'on.' : 'off.'));
    if (clarityId) text.push('Microsoft Clarity is ' +
      (choices.clarity === 'accepted' && safeReplayUrl() ? 'on.' : 'off on this page.'));
    if (persistenceWarning) text.push(persistenceWarning);
    status.textContent = text.join(' ');
    accept.disabled = save.disabled = forcedOff;
    close.hidden = !!needsChoice();
  }

  function hidePanel() {
    panel.hidden = true;
    preferences.setAttribute('aria-expanded', 'false');
    if (restoreFocus) preferences.focus();
    restoreFocus = false;
  }

  function initialiseQueue() {
    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== 'function') window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {
      analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'
    });
    window.gtag('set', 'ads_data_redaction', true);
    window.gtag('set', 'url_passthrough', false);
  }

  function send(name, parameters) {
    if (!measurementId || choices.ga4 !== 'accepted' || window[disableKey] || libraryState !== 'ready' || reloading) return;
    window.gtag('event', name, parameters);
  }

  function activate() {
    if (choices.ga4 !== 'accepted' || libraryState !== 'ready' || reloading) return;
    window[disableKey] = false;
    window.gtag('consent', 'update', {
      analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'
    });
    if (!configured) {
      window.gtag('js', new Date());
      window.gtag('config', measurementId, {
        send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false,
        cookie_flags: 'SameSite=Lax;Secure', cookie_expires: lifetime / 1000, cookie_update: false,
        page_location: pageLocation, page_referrer: pageReferrer
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

  function enableGoogle() {
    if (!measurementId || choices.ga4 !== 'accepted' || reloading || forcedOff) return;
    if (libraryState === 'ready') return activate();
    if (libraryState === 'loading') return;
    initialiseQueue();
    libraryState = 'loading';
    var library = document.createElement('script');
    library.async = true;
    library.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
    library.referrerPolicy = 'strict-origin';
    library.onload = function () { libraryState = 'ready'; activate(); };
    library.onerror = function () { libraryState = 'idle'; pendingEvents = []; library.remove(); };
    document.head.append(library);
  }

  function clearCookies(pattern) {
    try {
    var paths = ['/'];
    var prefix = '';
    window.location.pathname.split('/').filter(Boolean).forEach(function (part) {
      prefix += '/' + part;
      paths.push(prefix, prefix + '/');
    });
    var names = document.cookie.split(';').map(function (cookie) { return cookie.split('=')[0].trim(); })
      .filter(function (name) { return pattern.test(name); });
    names.forEach(function (name) {
      paths.forEach(function (path) {
        ['', host, '.' + host].forEach(function (domain) {
          document.cookie = name + '=; Max-Age=0; Path=' + path +
            (domain ? '; Domain=' + domain : '') + '; SameSite=Lax; Secure';
        });
      });
    });
    } catch (error) { /* Cookie restrictions never block withdrawal or contact. */ }
  }

  function disableGoogle() {
    if (disableKey) window[disableKey] = true;
    pendingEvents = [];
    clearCookies(/^_ga(?:_|$)/);
  }

  function maskReplayContent() {
    document.body.setAttribute('data-clarity-mask', 'true');
    document.querySelectorAll('input, textarea, select, [contenteditable], #coverage-form, #coverage-results')
      .forEach(function (node) { node.setAttribute('data-clarity-mask', 'true'); });
  }

  function enableClarity() {
    if (!clarityId || choices.clarity !== 'accepted' || !safeReplayUrl() || reloading || clarityState !== 'idle') return;
    maskReplayContent();
    if (typeof window.clarity !== 'function') {
      window.clarity = function () { (window.clarity.q = window.clarity.q || []).push(arguments); };
    }
    // This API is queued only after explicit replay consent. Denied consent can
    // restart cookieless recording, so withdrawal uses stop and a clean reload.
    window.clarity('consentv2', { analytics_Storage: 'granted', ad_Storage: 'denied' });
    clarityState = 'loading';
    clarityLibrary = document.createElement('script');
    clarityLibrary.async = true;
    clarityLibrary.src = 'https://www.clarity.ms/tag/' + clarityId;
    clarityLibrary.referrerPolicy = 'no-referrer';
    clarityLibrary.onload = function () {
      if (!reloading && choices.clarity === 'accepted') clarityState = 'ready';
    };
    clarityLibrary.onerror = function () {
      // A partial vendor load cannot safely be resumed in this document.
      clarityState = 'failed';
    };
    document.head.append(clarityLibrary);
  }

  function stopClarityAndReload(forceSafeAddress) {
    if (reloading) return;
    reloading = true;
    try {
      if (typeof window.clarity === 'function') window.clarity('stop');
    } catch (error) { /* A vendor error must never prevent withdrawal. */ }
    finally {
      try {
        clearCookies(/^_cl(?:ck|sk)$/i);
        if (clarityLibrary) clarityLibrary.remove();
      } catch (error) { /* Restricted cookie storage must not trap the old runtime. */ }
      finally {
        if (forceSafeAddress) {
          window.location.replace(window.location.pathname + window.location.search + '#optional-analytics-off');
        }
        window.location.reload();
      }
    }
  }

  function applyChoices(next, persist) {
    choices = { ga4: next.ga4, clarity: next.clarity };
    var result = persist ? saveChoice() : null;
    var stoppingReplay = clarityState !== 'idle' && choices.clarity !== 'accepted';
    // A storage clear or stale cross tab write must not resurrect prior replay consent.
    if (stoppingReplay && !persist) {
      result = saveChoice();
      if (choices.clarity === null) result.cookieSaved = saveRefusals({ ga4: choices.ga4, clarity: 'declined' });
    }
    var refusing = choices.ga4 === 'declined' || choices.clarity === 'declined' || stoppingReplay;
    var cannotPersist = result && !result.saved && !result.cookieSaved && !result.cleared && refusing;
    if (cannotPersist) {
      forcedOff = true;
      choices = { ga4: 'declined', clarity: 'declined' };
      persistenceWarning = 'Your browser could not save your choice. Optional analytics is off on this page. Enable browser storage before choosing again.';
    }
    updateStatus();
    if (choices.ga4 !== 'accepted' || forcedOff) disableGoogle();
    if (stoppingReplay) {
      stopClarityAndReload(cannotPersist);
      return;
    }
    if (choices.clarity !== 'accepted') clearCookies(/^_cl(?:ck|sk)$/i);
    if (cannotPersist) {
      window.location.replace(window.location.pathname + window.location.search + '#optional-analytics-off');
    }
    enableGoogle();
    enableClarity();
  }

  accept.addEventListener('click', function () {
    applyChoices({ ga4: measurementId ? 'accepted' : choices.ga4,
      clarity: clarityId ? 'accepted' : choices.clarity }, true);
    hidePanel();
  });
  decline.addEventListener('click', function () {
    applyChoices({ ga4: measurementId ? 'declined' : choices.ga4,
      clarity: clarityId ? 'declined' : choices.clarity }, true);
    hidePanel();
  });
  save.addEventListener('click', function () {
    applyChoices({ ga4: gaInput ? (gaInput.checked ? 'accepted' : 'declined') : choices.ga4,
      clarity: clarityInput ? (clarityInput.checked ? 'accepted' : 'declined') : choices.clarity }, true);
    hidePanel();
  });
  close.addEventListener('click', hidePanel);
  preferences.addEventListener('click', function () {
    restoreFocus = true;
    updateStatus();
    panel.hidden = false;
    preferences.setAttribute('aria-expanded', 'true');
    title.focus();
  });
  panel.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !needsChoice()) hidePanel();
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
    if (!measurementId || choices.ga4 !== 'accepted' || reloading || event.defaultPrevented ||
        (event.button && event.button !== 0)) return;
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
    if (event.key !== storageKey && event.key !== legacyKey && event.key !== null) return;
    if (event.key === legacyKey && event.newValue) {
      try {
        var olderTab = JSON.parse(event.newValue);
        if (olderTab && olderTab.version === 1 && olderTab.choice === 'declined') {
          applyChoices({ ga4: 'declined', clarity: choices.clarity }, true);
          if (!needsChoice()) hidePanel();
          return;
        }
      } catch (error) { /* Invalid legacy storage never grants either provider. */ }
    }
    applyChoices(readChoice(), false);
    if (!needsChoice()) hidePanel();
    else panel.hidden = false;
  });
  function checkReplayNavigation() {
    if (clarityState !== 'idle' && !safeReplayUrl()) stopClarityAndReload();
  }
  window.addEventListener('hashchange', checkReplayNavigation);
  window.addEventListener('popstate', checkReplayNavigation);

  applyChoices(readChoice(), false);
  if (needsChoice()) panel.hidden = false;
}());
