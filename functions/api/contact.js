// Cloudflare Pages Function: POST /api/contact
//
// Receives the website enquiry form, checks it, verifies Cloudflare Turnstile
// and creates a crm.lead in Odoo through the JSON-2 API.
//
// Secrets are never stored in this repository or sent to the browser. They are
// read from the Cloudflare Pages project's encrypted environment:
//   ODOO_API_KEY      API key of a restricted Odoo user that may create leads
//   TURNSTILE_SECRET  Turnstile widget secret key
// Optional plain settings:
//   ODOO_URL          defaults to https://erp.sampsonheavydiesel.com.au
//   ODOO_DATABASE     only needed when the Odoo server hosts several databases
//   ALLOWED_ORIGIN    defaults to https://sampsonheavydiesel.com.au

const DEFAULT_ODOO_URL = 'https://erp.sampsonheavydiesel.com.au';
const DEFAULT_ORIGIN = 'https://sampsonheavydiesel.com.au';
const MAX_BODY_BYTES = 16 * 1024;
const EQUIPMENT = new Set(['', 'Truck', 'Heavy equipment', 'Farm machinery', 'Other']);
const LIMITS = { name: 100, email: 254, phone: 30, location: 120, message: 2000 };

function respond(request, status, body, redirect) {
  const wantsJson = (request.headers.get('Accept') || '').includes('application/json');
  if (!wantsJson && redirect) {
    return new Response(null, { status: 303, headers: { Location: redirect, 'Cache-Control': 'no-store' } });
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function clean(value, limit) {
  return String(value || '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r\n?/g, '\n')
    .trim()
    .slice(0, limit);
}

export function validate(fields) {
  const data = {
    name: clean(fields.name, LIMITS.name).replace(/\s+/g, ' '),
    email: clean(fields.email, LIMITS.email).toLowerCase(),
    phone: clean(fields.phone, LIMITS.phone),
    location: clean(fields.location, LIMITS.location).replace(/\s+/g, ' '),
    equipment: clean(fields.equipment, 40),
    message: clean(fields.message, LIMITS.message),
  };
  const errors = {};
  if (data.name.length < 2) errors.name = 'Enter your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) errors.email = 'Enter a valid email address.';
  const digits = data.phone.replace(/[^\d]/g, '');
  if (!/^[+\d\s()]+$/.test(data.phone) || digits.length < 8 || digits.length > 15) {
    errors.phone = 'Enter a valid phone number.';
  }
  if (!EQUIPMENT.has(data.equipment)) errors.equipment = 'Choose an equipment type.';
  return { data, errors };
}

export function leadValues(data, page) {
  const lines = [];
  if (data.message) lines.push(data.message, '');
  if (data.equipment) lines.push('Equipment: ' + data.equipment);
  if (data.location) lines.push('Location: ' + data.location);
  lines.push('Submitted from: ' + page);
  return {
    name: 'Website enquiry: ' + data.name,
    contact_name: data.name,
    email_from: data.email,
    phone: data.phone,
    description: lines.join('\n'),
  };
}

async function readFields(request) {
  const type = request.headers.get('Content-Type') || '';
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) return null;
  if (type.includes('application/json')) {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  }
  return Object.fromEntries(new URLSearchParams(text));
}

async function verifyTurnstile(secret, token, ip, expectedHost) {
  const form = new URLSearchParams({ secret, response: token });
  if (ip) form.set('remoteip', ip);
  const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST', body: form,
  });
  if (!result.ok) return false;
  const outcome = await result.json();
  return outcome.success === true && (!outcome.hostname || outcome.hostname === expectedHost);
}

async function createLead(env, values) {
  const base = (env.ODOO_URL || DEFAULT_ODOO_URL).replace(/\/+$/, '');
  const headers = {
    Authorization: 'bearer ' + env.ODOO_API_KEY,
    'Content-Type': 'application/json; charset=utf-8',
    'User-Agent': 'sampsonheavydiesel-website-form',
  };
  if (env.ODOO_DATABASE) headers['X-Odoo-Database'] = env.ODOO_DATABASE;
  const result = await fetch(base + '/json/2/crm.lead/create', {
    method: 'POST', headers, body: JSON.stringify({ vals_list: [values] }),
  });
  if (!result.ok) throw new Error('Odoo responded ' + result.status);
  const ids = await result.json();
  if (!Array.isArray(ids) || !Number.isInteger(ids[0])) throw new Error('Unexpected Odoo response');
  return ids[0];
}

export async function onRequestPost({ request, env }) {
  const allowedOrigin = env.ALLOWED_ORIGIN || DEFAULT_ORIGIN;
  const failure = '/contact/?status=error';
  if (request.headers.get('Origin') !== allowedOrigin) {
    return respond(request, 403, { ok: false, error: 'This form can only be sent from the website.' }, failure);
  }
  if (!env.ODOO_API_KEY || !env.TURNSTILE_SECRET) {
    return respond(request, 503, { ok: false, error: 'The form is not available. Please call 0474 372 852.' }, failure);
  }
  let fields;
  try {
    fields = await readFields(request);
  } catch {
    fields = null;
  }
  if (!fields) return respond(request, 400, { ok: false, error: 'The form could not be read.' }, failure);

  // Honeypot: people never see this field, bots fill it in. Pretend success.
  if (clean(fields.company_website, 200)) {
    return respond(request, 200, { ok: true }, '/contact/?status=sent');
  }

  const { data, errors } = validate(fields);
  if (Object.keys(errors).length) return respond(request, 422, { ok: false, errors }, failure);

  const token = clean(fields['cf-turnstile-response'], 2048);
  const ip = request.headers.get('CF-Connecting-IP') || '';
  let human = false;
  try {
    human = token && await verifyTurnstile(env.TURNSTILE_SECRET, token, ip, new URL(allowedOrigin).hostname);
  } catch {
    human = false;
  }
  if (!human) {
    return respond(request, 400, { ok: false, error: 'The spam check did not pass. Please try again.' }, failure);
  }

  const referer = request.headers.get('Referer') || '';
  const page = referer.startsWith(allowedOrigin + '/') ? new URL(referer).pathname : '/contact/';
  try {
    await createLead(env, leadValues(data, page));
  } catch (error) {
    console.error('Lead creation failed:', error.message);
    return respond(request, 502, { ok: false, error: 'The enquiry could not be sent. Please call 0474 372 852.' }, failure);
  }
  return respond(request, 200, { ok: true }, '/contact/?status=sent');
}

export function onRequest({ request }) {
  return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
}
