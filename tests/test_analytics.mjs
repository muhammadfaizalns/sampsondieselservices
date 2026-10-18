import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../dist/analytics.js', import.meta.url), 'utf8');
const storageKey = 'sampson.analyticsConsent.v2';
const legacyKey = 'sampson.analyticsConsent.v1';
const measurementId = 'G-ABC1234567';
const clarityId = 'yzgu5ctzhl';
const productionOrigin = 'https://sampsonheavydiesel.com';
const lifetime = 270 * 86400000;
const legacyLifetime = 365 * 86400000;
const publicPaths = ['/', '/services/', '/services/mobile-truck-mechanic/', '/privacy/'];

class Element {
  constructor(tag, document) {
    this.tagName = tag.toUpperCase();
    this.document = document;
    this.children = [];
    this.attributes = {};
    this.listeners = {};
    this.dataset = {};
    this.hidden = false;
    this.textContent = '';
    this.checked = false;
  }
  setAttribute(name, value) { this.attributes[name] = value; }
  getAttribute(name) { return this.attributes[name] ?? this[name] ?? null; }
  append(...children) {
    children.forEach(child => { child.parent = this; this.children.push(child); });
  }
  remove() {
    if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this);
  }
  addEventListener(name, listener) { (this.listeners[name] ||= []).push(listener); }
  dispatch(name, event = {}) {
    event.target ||= this;
    for (const listener of this.listeners[name] || []) listener(event);
  }
  focus() { this.document.activeElement = this; }
  closest(selector) {
    if (selector === 'a[href]' && this.tagName === 'A' && this.getAttribute('href')) return this;
    if (selector.startsWith('.') && (this.className || '').split(' ').includes(selector.slice(1))) return this;
    if (selector.startsWith('#') && this.id === selector.slice(1)) return this;
    if (this.tagName.toLowerCase() === selector) return this;
    return this.parent?.closest(selector) || null;
  }
}

function setup({ hostname = 'sampsonheavydiesel.com', id = measurementId, clarity = '',
  initialChoice, expiresAt = Date.now() + 60000, legacyChoice,
  legacyExpiresAt = Date.now() + legacyLifetime, storageBlocked = false, refusal = '',
  storageFailures = { set: false, remove: false }, cookieFailures = { get: false, set: false },
  path = '/services/mobile-truck-mechanic/', canonicalPath = path,
  search = '', hash = '', referrer = 'https://search.example/', paths = publicPaths } = {}) {
  const store = new Map();
  if (initialChoice) store.set(storageKey, JSON.stringify({ version: 2, ...initialChoice, expiresAt }));
  if (legacyChoice) store.set(legacyKey, JSON.stringify({ version: 1, choice: legacyChoice, expiresAt: legacyExpiresAt }));
  const document = { listeners: {}, cookieWrites: [], referrer };
  document.createElement = tag => new Element(tag, document);
  document.head = document.createElement('head');
  document.body = document.createElement('body');
  const footer = document.createElement('footer');
  const footerLinks = document.createElement('nav');
  footerLinks.className = 'footer-links';
  footer.append(footerLinks);
  document.body.append(footer);
  const coverage = document.createElement('form');
  coverage.id = 'coverage-form';
  const lookup = document.createElement('input');
  lookup.value = 'Private postcode and name';
  coverage.append(lookup);
  const results = document.createElement('div');
  results.id = 'coverage-results';
  results.textContent = 'Private search result';
  const select = document.createElement('select');
  document.body.append(coverage, results, select);
  const canonical = document.createElement('link');
  canonical.href = productionOrigin + canonicalPath;
  document.head.append(canonical);
  const script = document.createElement('script');
  script.dataset = { ga4Id: id, clarityId: clarity, host: 'sampsonheavydiesel.com',
    publicPaths: JSON.stringify(paths) };
  document.currentScript = script;
  document.querySelector = selector => selector === 'link[rel="canonical"]' ? canonical :
    selector === '.footer-links' ? footerLinks : selector === 'footer' ? footer : null;
  function nodes(root) { return [root, ...root.children.flatMap(nodes)]; }
  document.querySelectorAll = () => nodes(document.body).filter(node =>
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(node.tagName) ||
    ['coverage-form', 'coverage-results'].includes(node.id) || 'contenteditable' in node.attributes);
  document.getElementById = id => nodes(document.body).find(node => node.id === id) || null;
  document.addEventListener = (name, listener) => { (document.listeners[name] ||= []).push(listener); };
  const cookies = new Map([['_ga', 'visitor'], ['_ga_ABC1234567', 'session'],
    ['_clck', 'clarity'], ['_clsk', 'clarity-session'], ['essential', 'keep']]);
  if (refusal) cookies.set('sampson_optional_refusal', refusal);
  Object.defineProperty(document, 'cookie', {
    get() {
      if (cookieFailures.get) throw new Error('Cookie read blocked');
      return [...cookies].map(([key, value]) => `${key}=${value}`).join('; ');
    },
    set(value) {
      if (cookieFailures.set) throw new Error('Cookie write blocked');
      document.cookieWrites.push(value);
      const pair = value.split(';')[0].split('=');
      if (value.includes('Max-Age=0')) cookies.delete(pair[0]);
      else cookies.set(pair[0], pair.slice(1).join('='));
    }
  });
  const maskSnapshots = [];
  const appendHead = document.head.append.bind(document.head);
  document.head.append = (...children) => {
    for (const child of children) {
      if (child.tagName === 'SCRIPT' && (child.src || '').includes('clarity.ms')) {
        maskSnapshots.push([document.body, coverage, lookup, results, select]
          .map(node => node.getAttribute('data-clarity-mask')));
      }
    }
    appendHead(...children);
  };
  let reloads = 0;
  const replacements = [];
  const window = {
    location: { hostname, protocol: 'https:', origin: `https://${hostname}`, pathname: path,
      search, hash, href: `https://${hostname}${path}${search}${hash}`,
      reload() { reloads++; },
      replace(value) {
        replacements.push(value);
        const next = new URL(value, this.origin);
        this.pathname = next.pathname; this.search = next.search; this.hash = next.hash; this.href = next.href;
      } },
    localStorage: {
      getItem(key) { if (storageBlocked) throw new Error('Storage blocked'); return store.get(key) ?? null; },
      setItem(key, value) { if (storageBlocked || storageFailures.set) throw new Error('Storage blocked'); store.set(key, value); },
      removeItem(key) { if (storageBlocked || storageFailures.remove) throw new Error('Storage blocked'); store.delete(key); }
    },
    listeners: {},
    addEventListener(name, listener) { (this.listeners[name] ||= []).push(listener); }
  };
  vm.runInNewContext(source, { window, document, URL, Date, Number, JSON });
  const button = label => nodes(document.body).find(node => node.tagName === 'BUTTON' && node.textContent === label);
  const scripts = provider => document.head.children.filter(node => node.tagName === 'SCRIPT' &&
    (!provider || node.src.includes(provider === 'ga4' ? 'googletagmanager.com' : 'clarity.ms')));
  const commands = () => (window.dataLayer || []).map(args => Array.from(args));
  const clarityCommands = () => (window.clarity?.q || []).map(args => Array.from(args));
  const events = name => commands().filter(command => command[0] === 'event' && (!name || command[1] === name));
  const visible = node => !!node && !node.hidden && (!node.parent || visible(node.parent));
  function click(label) {
    assert.ok(visible(button(label)), `Missing or hidden ${label}`);
    assert.notEqual(button(label).disabled, true, `Disabled ${label}`);
    button(label).dispatch('click');
  }
  function load(provider = 'ga4') { assert.equal(scripts(provider).length, 1); scripts(provider)[0].onload(); }
  function choose(ga4, replay) {
    if (!visible(button('Save choices'))) click(visible(document.getElementById('analytics-preferences-panel')) ? 'Settings' : 'Analytics preferences');
    if (document.getElementById('analytics-ga4-choice')) document.getElementById('analytics-ga4-choice').checked = ga4;
    if (document.getElementById('analytics-clarity-choice')) document.getElementById('analytics-clarity-choice').checked = replay;
    click('Save choices');
  }
  function contact(href, { className = '', tagName = 'section', event = {} } = {}) {
    const container = document.createElement(tagName);
    container.className = className;
    const link = document.createElement('a');
    link.setAttribute('href', href);
    link.textContent = 'Private name and arbitrary link text';
    container.append(link);
    document.body.append(container);
    const clickEvent = { target: link, button: 0, defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true; }, ...event };
    for (const listener of document.listeners.click || []) listener(clickEvent);
    return clickEvent;
  }
  return { window, document, store, button, scripts, commands, clarityCommands, events, click, load, choose, contact,
    panel: () => document.getElementById('analytics-preferences-panel'), cookies, visible,
    reloads: () => reloads, coverage, lookup, results, select, maskSnapshots,
    storageFailures, cookieFailures, replacements,
    storageChange(value) {
      if (value === null) store.delete(storageKey);
      else store.set(storageKey, JSON.stringify({ version: 2, ...value, expiresAt: Date.now() + 60000 }));
      for (const listener of window.listeners.storage || []) listener({ key: storageKey });
    },
    navigate(change, event = 'hashchange') {
      Object.assign(window.location, change);
      for (const listener of window.listeners[event] || []) listener({});
    } };
}

const accepted = { ga4: 'accepted', clarity: 'accepted' };
const declined = { ga4: 'declined', clarity: 'declined' };

test('compact notice hides detailed controls without moving focus or loading providers', () => {
  const page = setup({ clarity: clarityId });
  const fields = page.document.getElementById('analytics-tool-options');
  const status = page.panel().children.find(node => node.className === 'analytics-status');
  assert.equal(page.document.getElementById('analytics-preferences-title').textContent, 'Cookies and privacy');
  assert.equal(fields.hidden, true);
  assert.equal(status.hidden, true);
  assert.equal(page.visible(page.button('Save choices')), false);
  assert.equal(page.visible(page.button('Close preferences')), false);
  assert.equal(page.visible(page.button('Accept all')), true);
  assert.equal(page.visible(page.button('Reject optional')), true);
  assert.equal(page.visible(page.button('Settings')), true);
  assert.equal(page.document.activeElement, undefined);
  assert.equal(page.scripts().length, 0);
  assert.equal(page.store.has(storageKey), false);
});

test('settings and back or Escape never grant consent and discard unsaved changes', () => {
  const page = setup({ clarity: clarityId });
  page.click('Settings');
  assert.equal(page.document.activeElement.textContent, 'Your privacy choices');
  assert.equal(page.button('Settings').getAttribute('aria-expanded'), 'true');
  const ga4 = page.document.getElementById('analytics-ga4-choice');
  const clarity = page.document.getElementById('analytics-clarity-choice');
  assert.equal(page.visible(ga4), true);
  assert.equal(ga4.checked, false);
  assert.equal(clarity.checked, false);
  ga4.checked = clarity.checked = true;
  page.click('Back');
  assert.equal(page.document.activeElement, page.button('Settings'));
  assert.equal(page.visible(ga4), false);
  page.click('Settings');
  assert.equal(ga4.checked, false);
  assert.equal(clarity.checked, false);
  page.panel().dispatch('keydown', { key: 'Escape' });
  assert.equal(page.visible(page.button('Settings')), true);
  assert.equal(page.store.has(storageKey), false);
  assert.equal(page.scripts().length, 0);
});

test('footer opens saved preferences directly and cancelling leaves permissions unchanged', () => {
  const page = setup({ clarity: clarityId, initialChoice: declined });
  const original = page.store.get(storageKey);
  page.click('Analytics preferences');
  assert.equal(page.document.activeElement.textContent, 'Your privacy choices');
  assert.equal(page.visible(page.button('Save choices')), true);
  assert.equal(page.visible(page.button('Back')), false);
  page.document.getElementById('analytics-clarity-choice').checked = true;
  page.click('Close preferences');
  assert.equal(page.document.activeElement, page.button('Analytics preferences'));
  assert.equal(page.store.get(storageKey), original);
  page.click('Analytics preferences');
  assert.equal(page.document.getElementById('analytics-clarity-choice').checked, false);
  page.panel().dispatch('keydown', { key: 'Escape' });
  assert.equal(page.panel().hidden, true);
  page.choose(true, false);
  assert.equal(page.document.activeElement, page.button('Analytics preferences'));
  assert.equal(page.scripts('ga4').length, 1);
  assert.equal(page.scripts('clarity').length, 0);
});

test('compact notice discloses only configured providers and keeps Microsoft own use clear', () => {
  const google = setup();
  const replay = setup({ id: '', clarity: clarityId });
  const description = page => page.panel().children.find(node => node.className === 'analytics-description').textContent;
  assert.match(description(google), /Google Analytics/);
  assert.doesNotMatch(description(google), /Microsoft|Clarity/);
  assert.match(description(replay), /Microsoft Clarity replays masked activity/);
  assert.match(description(replay), /own products and advertising/);
  assert.doesNotMatch(description(replay), /Google/);
});

test('forced off preferences expose storage warning and disable grant controls', () => {
  const page = setup({ clarity: clarityId, initialChoice: accepted, hash: '#optional-analytics-off' });
  page.click('Analytics preferences');
  const status = page.panel().children.find(node => node.className === 'analytics-status');
  assert.equal(status.hidden, false);
  assert.match(status.textContent, /could not save your choice/);
  assert.equal(page.button('Accept all').disabled, true);
  assert.equal(page.button('Save choices').disabled, true);
  assert.equal(page.scripts().length, 0);
});

test('new visitors and rejection never load either provider; contact stays available', () => {
  const page = setup({ clarity: clarityId });
  assert.equal(page.panel().hidden, false);
  assert.equal(page.scripts().length, 0);
  assert.equal(page.commands().length, 0);
  assert.equal(page.clarityCommands().length, 0);
  assert.equal(page.contact('tel:+61474372852').defaultPrevented, false);
  page.click('Reject optional');
  assert.equal(page.panel().hidden, true);
  assert.equal(page.scripts().length, 0);
  assert.equal(JSON.parse(page.store.get(storageKey)).ga4, 'declined');
  assert.equal(JSON.parse(page.store.get(storageKey)).clarity, 'declined');
  assert.equal(page.cookies.has('essential'), true);
});

test('provider choices are independent and explicit save enables only selected provider', () => {
  const googleOnly = setup({ clarity: clarityId });
  googleOnly.choose(true, false);
  assert.equal(googleOnly.scripts('ga4').length, 1);
  assert.equal(googleOnly.scripts('clarity').length, 0);
  googleOnly.load();
  assert.equal(googleOnly.events('page_view').length, 1);
  const replayOnly = setup({ clarity: clarityId });
  replayOnly.choose(false, true);
  assert.equal(replayOnly.scripts('ga4').length, 0);
  assert.equal(replayOnly.scripts('clarity').length, 1);
  assert.equal(replayOnly.commands().length, 0);
});

test('accept all loads each provider once, preserves advertising denial and single GA view', () => {
  const page = setup({ clarity: clarityId });
  page.click('Accept all');
  assert.equal(page.scripts().length, 2);
  assert.equal(page.events().length, 0);
  page.load();
  page.load('clarity');
  assert.equal(page.events('page_view').length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(page.clarityCommands())), [
    ['consentv2', { analytics_Storage: 'granted', ad_Storage: 'denied' }]
  ]);
  const consent = page.commands().filter(command => command[0] === 'consent');
  assert.equal(consent[0][2].analytics_storage, 'denied');
  assert.equal(consent[1][2].analytics_storage, 'granted');
  for (const command of consent) {
    assert.equal(command[2].ad_storage, 'denied');
    assert.equal(command[2].ad_user_data, 'denied');
    assert.equal(command[2].ad_personalization, 'denied');
  }
  const config = page.commands().find(command => command[0] === 'config')[2];
  assert.equal(config.allow_google_signals, false);
  assert.equal(config.allow_ad_personalization_signals, false);
  assert.equal(config.cookie_expires, lifetime / 1000);
  page.click('Analytics preferences');
  assert.equal(page.document.activeElement.textContent, 'Your privacy choices');
  page.click('Accept all');
  assert.equal(page.events('page_view').length, 1);
  assert.equal(page.scripts().length, 2);
  assert.equal(page.document.activeElement, page.button('Analytics preferences'));
});

test('masked replay attributes exist before the remote Clarity script is appended', () => {
  const page = setup({ clarity: clarityId });
  page.choose(false, true);
  for (const node of [page.document.body, page.coverage, page.lookup, page.results, page.select]) {
    assert.equal(node.getAttribute('data-clarity-mask'), 'true');
  }
  assert.deepEqual(page.maskSnapshots, [['true', 'true', 'true', 'true', 'true']]);
  assert.equal(page.scripts('clarity')[0].referrerPolicy, 'no-referrer');
  assert.equal(page.clarityCommands().some(command => ['identify', 'set', 'event'].includes(command[0])), false);
});

test('valid legacy GA acceptance migrates only GA and prompts for separate replay consent', () => {
  const page = setup({ clarity: clarityId, legacyChoice: 'accepted' });
  assert.equal(page.scripts('ga4').length, 1);
  assert.equal(page.scripts('clarity').length, 0);
  assert.equal(page.panel().hidden, false);
  assert.equal(page.document.getElementById('analytics-ga4-choice').checked, true);
  assert.equal(page.document.getElementById('analytics-clarity-choice').checked, false);
  const saved = JSON.parse(page.store.get(storageKey));
  assert.equal(saved.version, 2);
  assert.equal(saved.ga4, 'accepted');
  assert.equal(saved.clarity, null);
  assert.ok(saved.expiresAt <= Date.now() + lifetime);
  assert.equal(page.store.has(legacyKey), false);
});

test('legacy acceptance older than nine months expires and never grants replay', () => {
  const page = setup({ clarity: clarityId, legacyChoice: 'accepted',
    legacyExpiresAt: Date.now() + 30 * 86400000 });
  assert.equal(page.scripts().length, 0);
  assert.equal(page.panel().hidden, false);
  assert.equal(JSON.parse(page.store.get(storageKey)).ga4, null);
});

test('legacy decline stays declined; neither provider loads', () => {
  const page = setup({ clarity: clarityId, legacyChoice: 'declined' });
  assert.equal(page.scripts().length, 0);
  assert.equal(page.panel().hidden, false);
  assert.equal(JSON.parse(page.store.get(storageKey)).ga4, 'declined');
});

test('saved choices reload independently and expired or malformed choices fail closed', () => {
  const page = setup({ clarity: clarityId, initialChoice: accepted });
  assert.equal(page.panel().hidden, true);
  assert.equal(page.scripts().length, 2);
  for (const initialChoice of [declined, { ga4: null, clarity: null }, { ga4: true, clarity: 'accepted' }]) {
    const next = setup({ clarity: clarityId, initialChoice });
    assert.equal(next.scripts().length, 0);
  }
  for (const expiresAt of [Date.now() - 1, Date.now() + lifetime + 120000]) {
    const expired = setup({ clarity: clarityId, initialChoice: accepted, expiresAt });
    assert.equal(expired.scripts().length, 0);
    assert.equal(expired.panel().hidden, false);
  }
});

test('stored choice lasts no longer than nine months and clarity stays undecided if not configured', () => {
  const page = setup();
  page.click('Accept all');
  const saved = JSON.parse(page.store.get(storageKey));
  assert.ok(saved.expiresAt <= Date.now() + lifetime);
  assert.equal(saved.clarity, null);
});

test('unsafe current URLs, unknown paths and unsafe referrers block replay without blocking GA', () => {
  for (const options of [
    { search: '?email=private@example.com' }, { hash: '#Private-Person' },
    { path: '/Private-Person/', canonicalPath: '/404/' },
    { path: '/services/', canonicalPath: '/' }, { canonicalPath: '/404/' },
    { referrer: 'https://search.example/?q=Private' }, { referrer: 'https://search.example/#Private' },
    { referrer: 'https://search.example/people/Private-Person' },
    { referrer: productionOrigin + '/Private-Person/' }, { referrer: 'not a URL' },
    { paths: [] }, { paths: ['unsafe'] }
  ]) {
    const page = setup({ clarity: clarityId, initialChoice: accepted, ...options });
    assert.equal(page.scripts('clarity').length, 0, JSON.stringify(options));
    assert.equal(page.scripts('ga4').length, 1);
  }
  const known = setup({ clarity: clarityId, initialChoice: accepted, referrer: productionOrigin + '/services/' });
  assert.equal(known.scripts('clarity').length, 1);
});

test('same document hash and history navigation stop replay then reload without rewriting history', () => {
  for (const [change, event] of [[{ hash: '#Private' }, 'hashchange'],
    [{ pathname: '/Private/', search: '?message=Private' }, 'popstate']]) {
    const page = setup({ clarity: clarityId, initialChoice: accepted });
    page.navigate(change, event);
    assert.equal(page.reloads(), 1);
    assert.equal(page.scripts('clarity').length, 0);
    assert.equal(page.clarityCommands().at(-1)[0], 'stop');
    assert.equal(page.window.location.hash, change.hash || '');
  }
});

test('phone and SMS intent stay sanitized, controlled and independent of replay choice', () => {
  const page = setup({ clarity: clarityId, initialChoice: { ga4: 'accepted', clarity: 'declined' },
    search: '?email=private@example.com', hash: '#Private', referrer: 'https://search.example/?email=private@example.com' });
  page.load();
  page.contact('tel:+61474372852?name=Private', { className: 'mobile-contact' });
  page.contact('sms:+61474372852?body=Private-message', { tagName: 'header' });
  assert.equal(page.events('phone_click').length, 1);
  assert.equal(page.events('sms_click').length, 1);
  assert.equal(page.events('phone_click')[0][2].contact_placement, 'mobile');
  assert.equal(page.events('sms_click')[0][2].contact_placement, 'header');
  const payload = JSON.stringify(page.commands());
  for (const forbidden of ['Private', 'private@', '?email', '#Private', 'Private-message']) assert.equal(payload.includes(forbidden), false);
  assert.equal(page.events('page_view')[0][2].page_referrer, 'https://search.example');
  page.contact('https://other.example/?name=Private');
  page.contact('tel:+61474372852', { event: { defaultPrevented: true } });
  assert.equal(page.events('phone_click').length, 1);
});

test('GA withdrawal stops events and clears its accessible cookies without requiring a reload', () => {
  const page = setup({ initialChoice: { ga4: 'accepted', clarity: null } });
  page.load();
  const count = page.commands().length;
  page.click('Analytics preferences');
  page.click('Reject optional');
  page.contact('tel:+61474372852');
  assert.equal(page.commands().length, count);
  assert.equal(page.window[`ga-disable-${measurementId}`], true);
  assert.equal(page.cookies.has('_ga'), false);
  assert.equal(page.cookies.has('_ga_ABC1234567'), false);
  assert.equal(page.cookies.has('essential'), true);
  assert.equal(page.reloads(), 0);
  page.click('Analytics preferences');
  page.click('Accept all');
  assert.equal(page.events('page_view').length, 1);
});

test('replay withdrawal persists refusal, stops and reloads even while loading; GA preference stays separate', () => {
  for (const ready of [false, true]) {
    const page = setup({ clarity: clarityId, initialChoice: accepted });
    const originalScript = page.scripts('clarity')[0];
    if (ready) page.load('clarity');
    page.click('Analytics preferences');
    page.choose(true, false);
    assert.equal(JSON.parse(page.store.get(storageKey)).ga4, 'accepted');
    assert.equal(JSON.parse(page.store.get(storageKey)).clarity, 'declined');
    assert.equal(page.clarityCommands().at(-1)[0], 'stop');
    assert.equal(page.reloads(), 1);
    assert.equal(page.cookies.has('_clck'), false);
    assert.equal(page.cookies.has('_clsk'), false);
    assert.equal(page.cookies.has('essential'), true);
    originalScript.onload();
    assert.equal(page.scripts('clarity').length, 0);
    assert.equal(page.clarityCommands().filter(command => command[0] === 'consentv2').length, 1);
    assert.equal(page.clarityCommands().some(command => command[0] === 'consent'), false);
  }
});

test('vendor stop exception never blocks saved refusal and a clean reload', () => {
  const page = setup({ clarity: clarityId, initialChoice: accepted });
  page.window.clarity = () => { throw new Error('Vendor failure'); };
  page.click('Analytics preferences');
  page.click('Reject optional');
  assert.equal(page.reloads(), 1);
  assert.equal(JSON.parse(page.store.get(storageKey)).clarity, 'declined');
});

test('withdrawing GA during loading clears pending contact events', () => {
  const page = setup();
  page.click('Accept all');
  page.contact('tel:+61474372852');
  page.click('Analytics preferences');
  page.click('Reject optional');
  page.load();
  assert.equal(page.events().length, 0);
  assert.equal(page.commands().some(command => command[0] === 'config'), false);
});

test('failed remote loads cannot break contacts and GA can retry without duplicate views', () => {
  const page = setup({ clarity: clarityId });
  page.click('Accept all');
  page.scripts('ga4')[0].onerror();
  page.scripts('clarity')[0].onerror();
  assert.equal(page.contact('sms:+61474372852').defaultPrevented, false);
  page.click('Analytics preferences');
  page.choose(true, true);
  assert.equal(page.scripts('ga4').length, 1);
  assert.equal(page.scripts('clarity').length, 1, 'Do not reinitialize a partially loaded recorder in the same document');
  page.load();
  assert.equal(page.events('page_view').length, 1);
  page.choose(true, false);
  assert.equal(page.reloads(), 1);
});

test('blocked local storage leaves current page choices usable and withdrawal still reloads', () => {
  const page = setup({ clarity: clarityId, storageBlocked: true });
  page.choose(true, true);
  page.load();
  page.contact('tel:+61474372852');
  assert.equal(page.events('phone_click').length, 1);
  page.click('Analytics preferences');
  page.click('Reject optional');
  assert.equal(page.reloads(), 1);
  assert.equal(page.contact('tel:+61474372852').defaultPrevented, false);
});

test('cross tab withdrawal and storage clearing stop replay and reload once', () => {
  for (const choice of [declined, null]) {
    const page = setup({ clarity: clarityId, initialChoice: accepted });
    page.storageChange(choice);
    assert.equal(page.window[`ga-disable-${measurementId}`], true);
    assert.equal(page.reloads(), 1);
    assert.equal(page.clarityCommands().at(-1)[0], 'stop');
    page.storageChange(choice);
    assert.equal(page.reloads(), 1);
  }
});

test('legacy tab GA decline cannot be ignored by the migrated tab', () => {
  const page = setup({ clarity: clarityId, initialChoice: accepted });
  page.load();
  for (const listener of page.window.listeners.storage) listener({ key: legacyKey,
    newValue: JSON.stringify({ version: 1, choice: 'declined', expiresAt: Date.now() + legacyLifetime }) });
  assert.equal(page.window[`ga-disable-${measurementId}`], true);
  assert.equal(JSON.parse(page.store.get(storageKey)).clarity, 'accepted');
  assert.equal(page.reloads(), 0);
});

test('preview hosts and invalid provider IDs create no UI or remote requests', () => {
  for (const options of [
    { hostname: 'localhost' }, { hostname: 'www.sampsonheavydiesel.com' }, { hostname: 'preview.pages.dev' },
    { id: 'G-PLACEHOLDER', clarity: 'bad&id' }, { id: 'UA-1234567-1' }, { id: '', clarity: '' }
  ]) {
    const page = setup({ initialChoice: accepted, ...options });
    assert.equal(page.panel(), null);
    assert.equal(page.scripts().length, 0);
  }
  const clarityOnly = setup({ id: '', clarity: clarityId, initialChoice: accepted });
  assert.equal(clarityOnly.scripts('clarity').length, 1);
  assert.equal(clarityOnly.scripts('ga4').length, 0);
});

test('arbitrary 404 paths never reach GA payloads or Clarity', () => {
  const page = setup({ clarity: clarityId, initialChoice: accepted,
    path: '/Private-Person/private@example.com/', canonicalPath: '/404/' });
  page.load();
  page.contact('tel:+61474372852');
  assert.equal(page.events('page_view')[0][2].page_location, productionOrigin + '/404/');
  assert.equal(page.events('phone_click')[0][2].page_path, '/404/');
  assert.equal(JSON.stringify(page.commands()).includes('Private-Person'), false);
  assert.equal(page.scripts('clarity').length, 0);
});

test('visitor facing consent copy has no dash characters', () => {
  const page = setup({ clarity: clarityId });
  function text(node) { return node.textContent + node.children.map(text).join(' '); }
  assert.doesNotMatch(text(page.panel()), /[-\u2013\u2014]/);
});


test('readable but unwritable saved acceptance cannot restart either provider', () => {
  const page = setup({ clarity: clarityId, initialChoice: accepted,
    storageFailures: { set: true, remove: true } });
  assert.equal(page.scripts().length, 0);
  assert.equal(page.panel().hidden, false);
});

test('selective storage write failure retains a durable restrictive cookie despite a stale accepted record', () => {
  const page = setup({ clarity: clarityId, initialChoice: accepted });
  page.storageFailures.set = true;
  page.storageFailures.remove = true;
  page.click('Analytics preferences');
  page.choose(true, false);
  assert.equal(page.reloads(), 1);
  assert.equal(JSON.parse(page.store.get(storageKey)).clarity, 'accepted', 'Stale grant remains readable');
  assert.equal(page.cookies.get('sampson_optional_refusal'), 'clarity');
  const next = setup({ clarity: clarityId, initialChoice: accepted,
    refusal: page.cookies.get('sampson_optional_refusal') });
  assert.equal(next.scripts('clarity').length, 0, 'A later writable document must still respect refusal');
  assert.equal(next.scripts('ga4').length, 1);
});

test('when persistence and cookie refusal both fail a fixed safe address prevents regrant after reload', () => {
  const page = setup({ clarity: clarityId, initialChoice: accepted });
  page.storageFailures.set = true;
  page.storageFailures.remove = true;
  page.cookieFailures.set = true;
  page.click('Analytics preferences');
  page.click('Reject optional');
  assert.equal(page.reloads(), 1);
  assert.equal(page.window.location.hash, '#optional-analytics-off');
  assert.equal(page.replacements.length, 1);
  assert.equal(JSON.parse(page.store.get(storageKey)).clarity, 'accepted');
  const next = setup({ clarity: clarityId, initialChoice: accepted, hash: page.window.location.hash });
  assert.equal(next.scripts().length, 0, 'Recovered storage cannot resurrect the old accepted record');
  assert.equal(next.button('Accept all').disabled, true);
  assert.match(next.document.getElementById('analytics-preferences-panel').children.find(node => node.className === 'analytics-status').textContent,
    /could not save your choice/);
});

test('cookie getter or setter failures cannot block decline, Clarity stop or clean reload', () => {
  for (const operation of ['get', 'set']) {
    const page = setup({ clarity: clarityId, initialChoice: accepted });
    page.cookieFailures[operation] = true;
    page.click('Analytics preferences');
    page.click('Reject optional');
    assert.equal(page.window[`ga-disable-${measurementId}`], true);
    assert.equal(page.reloads(), 1);
    assert.equal(page.clarityCommands().at(-1)[0], 'stop');
    assert.equal(JSON.parse(page.store.get(storageKey)).clarity, 'declined');
  }
});

test('cross tab storage clearing leaves a refusal even if a stale grant is restored before reload', () => {
  const page = setup({ clarity: clarityId, initialChoice: accepted });
  page.storageChange(null);
  assert.equal(page.reloads(), 1);
  assert.equal(page.cookies.get('sampson_optional_refusal'), 'clarity');
  const next = setup({ clarity: clarityId, initialChoice: accepted,
    refusal: page.cookies.get('sampson_optional_refusal') });
  assert.equal(next.scripts('clarity').length, 0);
});

test('idle refused or expired replay clears accessible Clarity identifiers without loading a recorder', () => {
  for (const options of [{ initialChoice: declined }, { initialChoice: accepted, expiresAt: Date.now() - 1 }]) {
    const page = setup({ clarity: clarityId, ...options });
    assert.equal(page.scripts('clarity').length, 0);
    assert.equal(page.cookies.has('_clck'), false);
    assert.equal(page.cookies.has('_clsk'), false);
  }
});
