import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../dist/analytics.js', import.meta.url), 'utf8');
const storageKey = 'sampson.analyticsConsent.v1';
const measurementId = 'G-ABC1234567';
const productionOrigin = 'https://sampsonheavydiesel.com';

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

function setup({ hostname = 'sampsonheavydiesel.com', id = measurementId,
  initialChoice, expiresAt = Date.now() + 60000, storageBlocked = false,
  path = '/services/mobile-truck-mechanic/', canonicalPath = path,
  search = '?email=private%40example.com&phone=0412345678',
  referrer = 'https://search.example/results?email=private@example.com' } = {}) {
  const store = new Map();
  if (initialChoice) store.set(storageKey, JSON.stringify({ version: 1, choice: initialChoice, expiresAt }));
  const document = { listeners: {}, cookieWrites: [], referrer };
  document.createElement = tag => new Element(tag, document);
  document.head = document.createElement('head');
  document.body = document.createElement('body');
  const footer = document.createElement('footer');
  const footerLinks = document.createElement('nav');
  footerLinks.className = 'footer-links';
  footer.append(footerLinks);
  document.body.append(footer);
  const canonical = document.createElement('link');
  canonical.href = productionOrigin + canonicalPath;
  document.head.append(canonical);
  const script = document.createElement('script');
  script.dataset = { ga4Id: id, host: 'sampsonheavydiesel.com' };
  document.currentScript = script;
  document.querySelector = selector => selector === 'link[rel="canonical"]' ? canonical :
    selector === '.footer-links' ? footerLinks : selector === 'footer' ? footer : null;
  function nodes(root) { return [root, ...root.children.flatMap(nodes)]; }
  document.getElementById = id => nodes(document.body).find(node => node.id === id) || null;
  document.addEventListener = (name, listener) => { (document.listeners[name] ||= []).push(listener); };
  const cookies = new Map([['_ga', 'visitor'], ['_ga_ABC1234567', 'session'], ['essential', 'keep']]);
  Object.defineProperty(document, 'cookie', {
    get() { return [...cookies].map(([key, value]) => `${key}=${value}`).join('; '); },
    set(value) {
      document.cookieWrites.push(value);
      if (value.includes('Max-Age=0')) cookies.delete(value.split('=')[0]);
    }
  });
  const window = {
    location: { hostname, protocol: 'https:', origin: `https://${hostname}`, pathname: path,
      search, hash: '#name=Private-Person', href: `https://${hostname}${path}${search}#private` },
    localStorage: {
      getItem(key) { if (storageBlocked) throw new Error('Storage blocked'); return store.get(key) ?? null; },
      setItem(key, value) { if (storageBlocked) throw new Error('Storage blocked'); store.set(key, value); },
      removeItem(key) { if (storageBlocked) throw new Error('Storage blocked'); store.delete(key); }
    },
    listeners: {},
    addEventListener(name, listener) { (this.listeners[name] ||= []).push(listener); }
  };
  vm.runInNewContext(source, { window, document, URL, Date, Number, JSON });
  const button = label => nodes(document.body).find(node => node.tagName === 'BUTTON' && node.textContent === label);
  const scripts = () => document.head.children.filter(node => node.tagName === 'SCRIPT');
  const commands = () => (window.dataLayer || []).map(args => Array.from(args));
  const events = name => commands().filter(command => command[0] === 'event' && (!name || command[1] === name));
  function click(label) { assert.ok(button(label), `Missing ${label}`); button(label).dispatch('click'); }
  function load() { assert.equal(scripts().length, 1); scripts()[0].onload(); }
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
  return { window, document, store, button, scripts, commands, events, click, load, contact,
    panel: () => document.getElementById('analytics-preferences-panel'), cookies,
    storageChange(value) {
      if (value === null) store.delete(storageKey);
      else store.set(storageKey, JSON.stringify({ version: 1, choice: value, expiresAt: Date.now() + 60000 }));
      for (const listener of window.listeners.storage || []) listener({ key: storageKey });
    } };
}

test('new visitor and declined choice never load Google, but contact links still work', () => {
  const page = setup();
  assert.equal(page.panel().hidden, false);
  assert.equal(page.scripts().length, 0);
  assert.equal(page.commands().length, 0);
  assert.equal(page.contact('tel:+61474372852').defaultPrevented, false);
  page.click('Decline analytics');
  assert.equal(page.panel().hidden, true);
  assert.equal(page.scripts().length, 0);
  assert.equal(page.events().length, 0);
  assert.equal(JSON.parse(page.store.get(storageKey)).choice, 'declined');
  assert.equal(page.cookies.has('essential'), true);
  assert.equal(page.cookies.has('_ga'), false);
});

test('decline then opt in loads once, sends one sanitized page view and no advertising consent', () => {
  const page = setup();
  page.click('Decline analytics');
  page.click('Analytics preferences');
  assert.equal(page.document.activeElement.textContent, 'Your analytics choice');
  page.click('Accept analytics');
  assert.equal(page.document.activeElement, page.button('Analytics preferences'));
  assert.equal(page.scripts().length, 1);
  assert.equal(page.events().length, 0, 'No event queued before library readiness');
  page.load();
  assert.equal(page.events('page_view').length, 1);
  const view = page.events('page_view')[0][2];
  assert.equal(view.page_location, productionOrigin + '/services/mobile-truck-mechanic/');
  assert.equal(view.page_referrer, 'https://search.example');
  const consentCommands = page.commands().filter(command => command[0] === 'consent');
  assert.equal(consentCommands[0][2].analytics_storage, 'denied');
  assert.equal(consentCommands[1][2].analytics_storage, 'granted');
  for (const command of consentCommands) {
    assert.equal(command[2].ad_storage, 'denied');
    assert.equal(command[2].ad_user_data, 'denied');
    assert.equal(command[2].ad_personalization, 'denied');
  }
  const config = page.commands().find(command => command[0] === 'config')[2];
  assert.equal(config.send_page_view, false);
  assert.equal(config.allow_google_signals, false);
  assert.equal(config.allow_ad_personalization_signals, false);
  page.click('Analytics preferences');
  page.click('Accept analytics');
  assert.equal(page.scripts().length, 1);
  assert.equal(page.events('page_view').length, 1);
  assert.equal(page.commands().filter(command => command[0] === 'config').length, 1);
});

test('saved consent reloads only accepted visitors and expired consent asks again', () => {
  const accepted = setup({ initialChoice: 'accepted' });
  assert.equal(accepted.panel().hidden, true);
  accepted.load();
  assert.equal(accepted.events('page_view').length, 1);
  const declined = setup({ initialChoice: 'declined' });
  assert.equal(declined.scripts().length, 0);
  assert.equal(declined.panel().hidden, true);
  const expired = setup({ initialChoice: 'accepted', expiresAt: Date.now() - 1 });
  assert.equal(expired.scripts().length, 0);
  assert.equal(expired.panel().hidden, false);
});

test('phone and SMS intent use controlled placement, no href or arbitrary text, never block contact', () => {
  const page = setup({ initialChoice: 'accepted' });
  page.load();
  assert.equal(page.contact('tel:+61474372852?name=Private', { className: 'mobile-contact' }).defaultPrevented, false);
  assert.equal(page.contact('sms:+61474372852?body=Private-message', { tagName: 'header' }).defaultPrevented, false);
  assert.equal(page.events('phone_click').length, 1);
  assert.equal(page.events('sms_click').length, 1);
  assert.equal(page.events('phone_click')[0][2].contact_placement, 'mobile');
  assert.equal(page.events('sms_click')[0][2].contact_placement, 'header');
  for (const event of page.events()) {
    const payload = JSON.stringify(event);
    assert.equal(payload.includes('Private'), false);
    assert.equal(payload.includes('0412345678'), false);
    assert.equal(payload.includes('@'), false);
    assert.equal(payload.includes('?'), false);
    assert.equal(payload.includes('#'), false);
  }
  page.contact('https://other.example/?name=Private');
  page.contact('tel:+61474372852', { event: { defaultPrevented: true } });
  assert.equal(page.events('phone_click').length, 1);
});

test('withdrawal disables collection, clears known cookies and never sends further events', () => {
  const page = setup({ initialChoice: 'accepted' });
  page.load();
  const count = page.commands().length;
  page.click('Analytics preferences');
  page.click('Decline analytics');
  assert.equal(page.window[`ga-disable-${measurementId}`], true);
  page.contact('tel:+61474372852');
  page.contact('sms:+61474372852');
  assert.equal(page.commands().length, count);
  assert.equal(page.cookies.has('_ga'), false);
  assert.equal(page.cookies.has('_ga_ABC1234567'), false);
  assert.equal(page.cookies.has('essential'), true);
  assert.ok(page.document.cookieWrites.some(value => value.includes('Domain=.sampsonheavydiesel.com')));
  page.click('Analytics preferences');
  page.click('Accept analytics');
  assert.equal(page.events('page_view').length, 1, 'No duplicate view when consent changes on same page');
  assert.equal(page.window[`ga-disable-${measurementId}`], false);
});

test('withdrawing before remote library loads clears queued contact intent', () => {
  const page = setup();
  page.click('Accept analytics');
  page.contact('tel:+61474372852');
  page.click('Analytics preferences');
  page.click('Decline analytics');
  page.load();
  assert.equal(page.events().length, 0);
  assert.equal(page.commands().some(command => command[0] === 'config'), false);
  assert.equal(page.window[`ga-disable-${measurementId}`], true);
});

test('contact works during slow or failed analytics loading without a network dependency', () => {
  const page = setup();
  page.click('Accept analytics');
  assert.equal(page.contact('tel:+61474372852').defaultPrevented, false);
  assert.equal(page.events('phone_click').length, 0);
  page.load();
  assert.equal(page.events('phone_click').length, 1);
  const failed = setup();
  failed.click('Accept analytics');
  failed.scripts()[0].onerror();
  assert.equal(failed.contact('sms:+61474372852').defaultPrevented, false);
  assert.equal(failed.events('sms_click').length, 0);
  failed.click('Analytics preferences');
  failed.click('Accept analytics');
  assert.equal(failed.scripts().length, 1, 'Explicit acceptance can retry after failed library loading');
  failed.load();
  assert.equal(failed.events('page_view').length, 1);
});

test('blocked storage preserves current page consent and contact behavior', () => {
  const page = setup({ storageBlocked: true });
  page.click('Accept analytics');
  page.load();
  page.contact('tel:+61474372852');
  assert.equal(page.events('phone_click').length, 1);
  page.click('Analytics preferences');
  page.click('Decline analytics');
  assert.equal(page.contact('sms:+61474372852').defaultPrevented, false);
  assert.equal(page.events('sms_click').length, 0);
});

test('cross tab withdrawal and cleared storage stop tracking immediately', () => {
  const page = setup({ initialChoice: 'accepted' });
  page.load();
  page.storageChange('declined');
  page.contact('tel:+61474372852');
  assert.equal(page.events('phone_click').length, 0);
  assert.equal(page.window[`ga-disable-${measurementId}`], true);
  page.storageChange('accepted');
  page.contact('sms:+61474372852');
  assert.equal(page.events('sms_click').length, 1);
  page.storageChange(null);
  assert.equal(page.panel().hidden, false);
  assert.equal(page.window[`ga-disable-${measurementId}`], true);
});

test('preview hosts and invalid measurement IDs create neither UI nor Google requests', () => {
  for (const options of [
    { hostname: 'localhost' }, { hostname: 'www.sampsonheavydiesel.com' },
    { hostname: 'preview.pages.dev' }, { id: 'G-PLACEHOLDER' }, { id: 'G-ABC1234567&leak=1' },
    { id: 'UA-1234567-1' }, { id: '' }
  ]) {
    const page = setup({ initialChoice: 'accepted', ...options });
    assert.equal(page.panel(), null);
    assert.equal(page.scripts().length, 0);
    assert.equal(page.commands().length, 0);
  }
});

test('arbitrary 404 paths and URL fragments use published canonical path instead', () => {
  const page = setup({ initialChoice: 'accepted', path: '/Private-Person/private@example.com/', canonicalPath: '/404.html' });
  page.load();
  page.contact('tel:+61474372852');
  assert.equal(page.events('page_view')[0][2].page_location, productionOrigin + '/404.html');
  assert.equal(page.events('phone_click')[0][2].page_path, '/404.html');
  assert.equal(JSON.stringify(page.commands()).includes('Private-Person'), false);
});
