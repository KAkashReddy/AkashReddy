(() => {
  const film = document.getElementById('launch-film');
  const introCard = document.getElementById('launch-glass');
  const skip = document.getElementById('film-skip');
  const site = document.getElementById('site-content');
  const root = document.documentElement;
  if (!site) return;
  if (!film || !introCard || !skip
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    || document.documentElement.classList.contains('performance-lite')) {
    if (film) film.hidden = true;
    site.inert = false;
    root.classList.remove('intro-pending');
    return;
  }

  root.classList.add('intro-pending');
  site.inert = true;
  let finished = false;
  let fallbackTimer;
  const handleKeydown = (event) => {
    if (event.key === 'Escape') finishIntro();
  };
  const finishIntro = () => {
    if (finished) return;
    finished = true;
    window.clearTimeout(fallbackTimer);
    window.removeEventListener('keydown', handleKeydown);
    film.hidden = true;
    site.inert = false;
    root.classList.remove('intro-pending');
  };
  const parseCssTime = (value) => value.trim().endsWith('ms')
    ? Number.parseFloat(value)
    : Number.parseFloat(value) * 1000;
  const filmStyle = window.getComputedStyle(film);
  const animationTime = parseCssTime(filmStyle.animationDuration) + parseCssTime(filmStyle.animationDelay);
  fallbackTimer = window.setTimeout(finishIntro, Math.max(1000, animationTime + 180));

  film.addEventListener('animationend', (event) => {
    if (event.target === film && event.animationName === 'film-clear') finishIntro();
  });
  skip.addEventListener('click', finishIntro);
  window.addEventListener('keydown', handleKeydown);
})();

(() => {
  const year = document.querySelector('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());

  const items = document.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    items.forEach((item) => item.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      currentObserver.unobserve(entry.target);
    });
  }, { threshold: 0.14 });

  items.forEach((item) => observer.observe(item));
})();

(() => {
  const root = document.documentElement;
  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;

  let transitionCleanup;
  const updateToggle = () => {
    const isDark = root.dataset.theme === 'dark';
    const label = isDark ? 'Use light mood' : 'Use dark mood';
    toggle.setAttribute('aria-label', label);
    toggle.title = label;
  };
  const setTheme = (theme) => {
    root.dataset.theme = theme;
    updateToggle();
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0c0f13' : '#f5f4ef');
    try { localStorage.setItem('portfolio-theme', theme); } catch {}
  };

  updateToggle();
  toggle.addEventListener('click', () => {
    const nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    const bounds = toggle.getBoundingClientRect();
    root.style.setProperty('--theme-origin-x', `${bounds.left + bounds.width / 2}px`);
    root.style.setProperty('--theme-origin-y', `${bounds.top + bounds.height / 2}px`);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!reducedMotion && typeof document.startViewTransition === 'function') {
      document.startViewTransition(() => setTheme(nextTheme));
      return;
    }

    root.classList.add('theme-transitioning');
    setTheme(nextTheme);
    window.clearTimeout(transitionCleanup);
    transitionCleanup = window.setTimeout(() => root.classList.remove('theme-transitioning'), 420);
  });
})();
