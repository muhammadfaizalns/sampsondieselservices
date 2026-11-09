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

  // Suburb lookup: the business supplied list, loaded on first use.
  var suburbInput = form.elements.location;
  var suburbList = document.getElementById('contact-location-list');
  var suburbCount = document.getElementById('contact-location-count');
  var suburbs = null;
  var suburbLabels = null;
  var suburbLoading = null;
  var suburbMatches = [];
  var activeIndex = -1;

  function normalise(text) {
    return text.toLowerCase().replace(/[’']/g, '').replace(/[(),\-]/g, ' ');
  }

  function loadSuburbs() {
    if (!suburbLoading) {
      suburbLoading = fetch('/assets/data/au-suburbs.json', { credentials: 'same-origin' })
        .then(function (response) { if (!response.ok) throw new Error('lookup'); return response.json(); })
        .then(function (rows) {
          suburbs = rows.map(function (row) {
            return { name: row[0], postcode: row[1], state: row[2], label: row[0] + ' ' + row[2] + ' ' + row[1],
              lower: normalise(row[0]), words: normalise(row[0]).split(/\s+/).filter(Boolean) };
          });
          suburbLabels = {};
          suburbs.forEach(function (item) { suburbLabels[item.label.toLowerCase()] = item.label; });
        })
        .catch(function () { suburbLoading = null; });
    }
    return suburbLoading;
  }

  function findSuburbs(query) {
    var tokens = normalise(query).split(/\s+/).filter(Boolean);
    if (!suburbs || !tokens.length) return [];
    var words = tokens.filter(function (token) { return !/^\d+$/.test(token); }).join(' ');
    var found = [];
    for (var i = 0; i < suburbs.length; i += 1) {
      var item = suburbs[i];
      var ok = tokens.every(function (token) {
        if (/^\d+$/.test(token)) return item.postcode.indexOf(token) === 0;
        if (token === item.state.toLowerCase()) return true;
        return item.words.some(function (word) { return word.indexOf(token) === 0; });
      });
      if (ok) {
        var rank = (item.state === 'VIC' ? 0 : 2) + (words && item.lower.indexOf(words) === 0 ? 0 : 1);
        found.push({ item: item, rank: rank });
      }
    }
    found.sort(function (a, b) { return a.rank - b.rank; });
    return found.slice(0, 8).map(function (entry) { return entry.item; });
  }

  function closeSuburbs() {
    suburbList.hidden = true;
    suburbInput.setAttribute('aria-expanded', 'false');
    suburbInput.removeAttribute('aria-activedescendant');
    activeIndex = -1;
  }

  function highlight(index) {
    var options = suburbList.querySelectorAll('[role="option"]');
    activeIndex = index;
    for (var i = 0; i < options.length; i += 1) options[i].setAttribute('aria-selected', i === index ? 'true' : 'false');
    if (options[index]) {
      suburbInput.setAttribute('aria-activedescendant', options[index].id);
      options[index].scrollIntoView({ block: 'nearest' });
    }
  }

  function chooseSuburb(index) {
    var item = suburbMatches[index];
    if (!item) return;
    suburbInput.value = item.label;
    setError('location', '');
    closeSuburbs();
  }

  function showSuburbs() {
    var query = suburbInput.value.trim();
    suburbList.textContent = '';
    if (query.length < 2 || !suburbs) { closeSuburbs(); suburbCount.textContent = ''; return; }
    suburbMatches = findSuburbs(query);
    if (!suburbMatches.length) {
      var empty = document.createElement('li');
      empty.className = 'suburb-empty';
      empty.textContent = 'No matching suburb. Check the spelling or try the postcode.';
      suburbList.appendChild(empty);
      suburbCount.textContent = 'No matching suburbs.';
    } else {
      suburbMatches.forEach(function (item, index) {
        var option = document.createElement('li');
        option.id = 'contact-location-option-' + index;
        option.setAttribute('role', 'option');
        option.setAttribute('aria-selected', 'false');
        var name = document.createElement('span');
        name.textContent = item.name;
        var meta = document.createElement('span');
        meta.className = 'suburb-meta';
        meta.textContent = item.state + ' ' + item.postcode;
        option.appendChild(name);
        option.appendChild(meta);
        option.addEventListener('mousedown', function (event) { event.preventDefault(); chooseSuburb(index); });
        suburbList.appendChild(option);
      });
      suburbCount.textContent = suburbMatches.length + (suburbMatches.length === 1 ? ' suburb' : ' suburbs') +
        ' found. Use the up and down arrows to choose.';
    }
    suburbList.hidden = false;
    suburbInput.setAttribute('aria-expanded', 'true');
    activeIndex = -1;
  }

  suburbInput.addEventListener('focus', loadSuburbs);
  suburbInput.addEventListener('input', function () {
    setError('location', '');
    if (suburbs) showSuburbs(); else loadSuburbs().then(showSuburbs);
  });
  suburbInput.addEventListener('keydown', function (event) {
    if (suburbList.hidden || !suburbMatches.length) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); highlight(Math.min(activeIndex + 1, suburbMatches.length - 1)); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); highlight(Math.max(activeIndex - 1, 0)); }
    else if (event.key === 'Enter') { event.preventDefault(); chooseSuburb(activeIndex < 0 ? 0 : activeIndex); }
    else if (event.key === 'Escape') { event.preventDefault(); closeSuburbs(); }
  });
  suburbInput.addEventListener('blur', function () {
    window.setTimeout(function () {
      closeSuburbs();
      var typed = suburbInput.value.trim();
      if (typed && suburbLabels && suburbLabels[typed.toLowerCase()]) suburbInput.value = suburbLabels[typed.toLowerCase()];
    }, 120);
  });

  var checks = {
    name: function (v) { return v.trim().length >= 2 ? '' : 'Enter your name.'; },
    email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Enter a valid email address.'; },
    phone: function (v) {
      var digits = v.replace(/[^\d]/g, '');
      return /^[+\d\s()]+$/.test(v.trim()) && digits.length >= 8 && digits.length <= 15 ? '' : 'Enter a valid phone number.';
    },
    location: function (v) {
      var typed = v.trim();
      if (!typed || !suburbLabels) return '';
      return suburbLabels[typed.toLowerCase()] ? '' : 'Choose a suburb from the list, or leave this empty.';
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
