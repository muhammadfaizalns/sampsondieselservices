(() => {
  const form = document.querySelector('#coverage-form');
  if (!form) return;
  const input = form.querySelector('input');
  const results = document.querySelector('#coverage-results');
  const button = form.querySelector('button');
  let dataset;
  let request = 0;
  const normalize = text => text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const load = () => dataset || (dataset = fetch('/assets/data/vic-localities-postcodes.json').then(response => {
    if (!response.ok) throw new Error('Lookup data unavailable');
    return response.json();
  }).catch(error => { dataset = null; throw error; }));
  input.addEventListener('focus', () => load().catch(() => {}), { once: true });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const token = ++request;
    const query = normalize(input.value.trim());
    if (query.length < 2) { button.disabled = false; results.textContent = 'Enter at least two letters or a four digit postcode.'; input.focus(); return; }
    results.textContent = 'Finding your location…'; button.disabled = true;
    try {
      const rows = await load();
      if (token !== request) return;
      const matches = rows.filter(([name, postcode]) => /^\d+$/.test(query) ? postcode.startsWith(query) : normalize(name).includes(query));
      matches.sort((a, b) => Number(normalize(b[0]) === query) - Number(normalize(a[0]) === query) || a[0].localeCompare(b[0]));
      results.replaceChildren();
      const status = document.createElement('p');
      status.textContent = matches.length ? `${matches.length} location ${matches.length === 1 ? 'match' : 'matches'}${matches.length > 12 ? '. Showing the first 12. Narrow your search for more precise results.' : '.'}` : 'No match in this locality snapshot. Call Clive with your nearest town, road or map pin.';
      results.append(status);
      if (matches.length) {
        const list = document.createElement('ul');
        for (const [name, postcode] of matches.slice(0, 12)) {
          const item = document.createElement('li');
          const title = document.createElement('strong');
          title.textContent = `${name.replace(/-/g, ' ')} VIC ${postcode}`;
          const detail = document.createElement('p');
          detail.textContent = 'Call Clive to confirm travel, job suitability and availability.';
          const call = document.createElement('a');
          call.href = 'tel:+61474372852'; call.className = 'text-link'; call.textContent = 'Call 0474 372 852';
          item.append(title, detail, call); list.append(item);
        }
        results.append(list);
      }
    } catch {
      results.textContent = 'Location lookup is unavailable. Call Clive on 0474 372 852 with your suburb, postcode or nearest town.';
    } finally {
      if (token === request) button.disabled = false;
    }
  });
  form.hidden = false;
})();
