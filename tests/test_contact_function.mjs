import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost, onRequest, validate, leadValues } from '../functions/api/contact.js';

const ORIGIN = 'https://sampsonheavydiesel.com.au';
const ENV = { ODOO_API_KEY: 'test-odoo-key', TURNSTILE_SECRET: 'test-turnstile-secret' };
const GOOD = {
  name: 'Jane Farmer', email: 'Jane@Example.com', phone: '0400 123 456', location: 'Warragul',
  equipment: 'Farm machinery', message: 'Tractor losing power on hills.', 'cf-turnstile-response': 'token-ok',
};

function request(fields, { origin = ORIGIN, json = true, referer = ORIGIN + '/contact/' } = {}) {
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded', 'CF-Connecting-IP': '203.0.113.9' };
  if (origin) headers.Origin = origin;
  if (json) headers.Accept = 'application/json';
  if (referer) headers.Referer = referer;
  return new Request(ORIGIN + '/api/contact', { method: 'POST', headers, body: new URLSearchParams(fields) });
}

function mockFetch({ human = true, hostname = 'sampsonheavydiesel.com.au', odooStatus = 200, odooBody = [42] } = {}) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url).startsWith('https://challenges.cloudflare.com/')) {
      return new Response(JSON.stringify({ success: human, hostname }), { status: 200 });
    }
    return new Response(JSON.stringify(odooBody), { status: odooStatus });
  };
  return calls;
}

test('valid enquiry verifies Turnstile then creates one Odoo lead with mapped fields', async () => {
  const calls = mockFetch();
  const response = await onRequestPost({ request: request(GOOD), env: ENV });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(calls.length, 2);
  const verify = new URLSearchParams(calls[0].init.body);
  assert.equal(verify.get('secret'), 'test-turnstile-secret');
  assert.equal(verify.get('response'), 'token-ok');
  assert.equal(verify.get('remoteip'), '203.0.113.9');
  assert.equal(calls[1].url, 'https://erp.sampsonheavydiesel.com.au/json/2/crm.lead/create');
  assert.equal(calls[1].init.headers.Authorization, 'bearer test-odoo-key');
  const values = JSON.parse(calls[1].init.body).vals_list[0];
  assert.deepEqual(Object.keys(values).sort(), ['contact_name', 'description', 'email_from', 'name', 'phone']);
  assert.equal(values.name, 'Website enquiry: Jane Farmer');
  assert.equal(values.contact_name, 'Jane Farmer');
  assert.equal(values.email_from, 'jane@example.com');
  assert.equal(values.phone, '0400 123 456');
  assert.match(values.description, /Tractor losing power/);
  assert.match(values.description, /Equipment: Farm machinery/);
  assert.match(values.description, /Location: Warragul/);
  assert.match(values.description, /Submitted from: \/contact\//);
});

test('name, email and phone are mandatory and nothing is sent upstream when invalid', async () => {
  for (const [field, value] of [['name', ''], ['email', 'not-an-email'], ['phone', '12'], ['phone', 'call me']]) {
    const calls = mockFetch();
    const response = await onRequestPost({ request: request({ ...GOOD, [field]: value }), env: ENV });
    assert.equal(response.status, 422, field + '=' + value);
    const body = await response.json();
    assert.ok(body.errors[field]);
    assert.equal(calls.length, 0);
  }
});

test('requests from other sites, failed spam checks and bots never reach Odoo', async () => {
  let calls = mockFetch();
  assert.equal((await onRequestPost({ request: request(GOOD, { origin: 'https://evil.example' }), env: ENV })).status, 403);
  assert.equal((await onRequestPost({ request: request(GOOD, { origin: null }), env: ENV })).status, 403);
  assert.equal(calls.length, 0);

  calls = mockFetch({ human: false });
  assert.equal((await onRequestPost({ request: request(GOOD), env: ENV })).status, 400);
  assert.equal(calls.length, 1);

  calls = mockFetch({ hostname: 'other.example' });
  assert.equal((await onRequestPost({ request: request(GOOD), env: ENV })).status, 400);
  assert.equal(calls.length, 1);

  calls = mockFetch();
  assert.equal((await onRequestPost({ request: request({ ...GOOD, 'cf-turnstile-response': '' }), env: ENV })).status, 400);
  assert.equal(calls.length, 0);

  calls = mockFetch();
  const trap = await onRequestPost({ request: request({ ...GOOD, company_website: 'http://spam' }), env: ENV });
  assert.equal(trap.status, 200);
  assert.equal(calls.length, 0);
});

test('missing secrets, Odoo errors and odd responses fail closed without leaking details', async () => {
  let calls = mockFetch();
  const unconfigured = await onRequestPost({ request: request(GOOD), env: {} });
  assert.equal(unconfigured.status, 503);
  assert.equal(calls.length, 0);

  for (const options of [{ odooStatus: 500, odooBody: { debug: 'Traceback secret path' } }, { odooBody: { id: 1 } }]) {
    calls = mockFetch(options);
    const original = console.error;
    console.error = () => {};
    const response = await onRequestPost({ request: request(GOOD), env: ENV });
    console.error = original;
    assert.equal(response.status, 502);
    const text = await response.text();
    assert.doesNotMatch(text, /Traceback|test-odoo-key|test-turnstile-secret/);
  }
});

test('optional database header, custom Odoo URL and no-JavaScript redirects', async () => {
  const calls = mockFetch();
  const env = { ...ENV, ODOO_URL: 'https://erp.example.test/', ODOO_DATABASE: 'sampson' };
  const response = await onRequestPost({ request: request(GOOD, { json: false }), env });
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('Location'), '/contact/?status=sent');
  assert.equal(calls[1].url, 'https://erp.example.test/json/2/crm.lead/create');
  assert.equal(calls[1].init.headers['X-Odoo-Database'], 'sampson');
});

test('oversized bodies, unknown equipment and non-POST methods are rejected', async () => {
  const calls = mockFetch();
  const big = await onRequestPost({ request: request({ ...GOOD, message: 'x'.repeat(20000) }), env: ENV });
  assert.equal(big.status, 400);
  const odd = await onRequestPost({ request: request({ ...GOOD, equipment: 'Spaceship' }), env: ENV });
  assert.equal(odd.status, 422);
  assert.equal(calls.length, 0);
  assert.equal(onRequest({ request: new Request(ORIGIN + '/api/contact') }).status, 405);
});

test('validation trims control characters and lead values keep the referring page path', () => {
  const { data, errors } = validate({ name: '  Bob \u0007 Smith ', email: ' BOB@X.COM ', phone: '+61 400 000 000' });
  assert.deepEqual(errors, {});
  assert.equal(data.name, 'Bob Smith');
  assert.equal(data.email, 'bob@x.com');
  assert.match(leadValues(data, '/services/truck-servicing/').description, /Submitted from: \/services\/truck-servicing\//);
});
