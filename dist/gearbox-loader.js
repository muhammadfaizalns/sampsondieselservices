const panel = document.querySelector('[data-gearbox]');
if (panel) {
  const start = () => import('./gearbox.js?v=6').then(module => module.mountGearbox(panel)).catch(() => panel.classList.add('component-unavailable'));
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        observer.disconnect();
        start();
      }
    }, { rootMargin: '250px' });
    observer.observe(panel);
  } else start();
}
