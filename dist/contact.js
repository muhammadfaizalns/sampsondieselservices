(function () {
  'use strict';
  var form = document.getElementById('contact-form');
  if (!form) return;
  var fallback = document.getElementById('form-fallback');
  var status = document.getElementById('form-status');
  var submit = document.getElementById('contact-submit');
  var siteKey = form.getAttribute('data-sitekey') || '';
  var widget = null;

  if (!siteKey) return; // Form stays hidden; the phone fallback remains visible.
  form.hidden = false;
  if (fallback) fallback.hidden = true;

  function show(message, kind) {
    status.textContent = message;
    status.className = 'form-status' + (kind ? ' is-' + kind : '');
    status.hidden = false;
    status.focus();
  }

  var params = new URLSearchParams(window.location.search);
  if (params.get('status') === 'sent') show('Thanks. Your enquiry has been sent and Clive will be in touch.', 'sent');
  if (params.get('status') === 'error') show('Your enquiry could not be sent. Please check the form or call 0474 372 852.', 'error');

  window.sampsonTurnstileReady = function () {
    widget = window.turnstile.render('#turnstile-slot', { sitekey: siteKey, action: 'contact', theme: 'light' });
  };
  var script = document.createElement('script');
  script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=sampsonTurnstileReady';
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);

  var checks = {
    name: function (v) { return v.trim().length >= 2 ? '' : 'Enter your name.'; },
    email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Enter a valid email address.'; },
    phone: function (v) {
      var digits = v.replace(/[^\d]/g, '');
      return /^[+\d\s()]+$/.test(v.trim()) && digits.length >= 8 && digits.length <= 15 ? '' : 'Enter a valid phone number.';
    }
  };

  function setError(name, message) {
    var input = form.elements[name];
    var box = document.getElementById(input.id + '-error');
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    box.textContent = message;
    box.hidden = !message;
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var first = null;
    Object.keys(checks).forEach(function (name) {
      var message = checks[name](form.elements[name].value);
      setError(name, message);
      if (message && !first) first = form.elements[name];
    });
    if (first) { first.focus(); return; }
    var data = new URLSearchParams(new FormData(form));
    if (!data.get('cf-turnstile-response')) {
      show('Please wait for the spam check to finish, then send again.', 'error');
      return;
    }
    submit.disabled = true;
    submit.textContent = 'Sending';
    fetch('/api/contact', { method: 'POST', headers: { Accept: 'application/json' }, body: data, credentials: 'same-origin' })
      .then(function (response) { return response.json().catch(function () { return { ok: false }; }); })
      .then(function (result) {
        if (result.ok) {
          form.reset();
          show('Thanks. Your enquiry has been sent and Clive will be in touch.', 'sent');
        } else if (result.errors) {
          Object.keys(result.errors).forEach(function (name) { if (checks[name]) setError(name, result.errors[name]); });
          show('Please check the highlighted fields.', 'error');
        } else {
          show(result.error || 'Your enquiry could not be sent. Please call 0474 372 852.', 'error');
        }
      })
      .catch(function () { show('Your enquiry could not be sent. Please call 0474 372 852.', 'error'); })
      .then(function () {
        submit.disabled = false;
        submit.textContent = 'Send enquiry';
        if (widget !== null && window.turnstile) window.turnstile.reset(widget);
      });
  });
}());
