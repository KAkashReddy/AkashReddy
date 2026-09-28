(() => {
  const film = document.getElementById('launch-film');
  const paper = document.getElementById('launch-paper');
  const skip = document.getElementById('film-skip');
  const site = document.getElementById('site-content');
  if (!film || !site) return;
  if (!paper || !skip) {
    film.hidden = true;
    site.inert = false;
    return;
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    film.hidden = true;
    site.inert = false;
    return;
  }

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
  };
  const parseCssTime = (value) => value.trim().endsWith('ms')
    ? Number.parseFloat(value)
    : Number.parseFloat(value) * 1000;
  const filmStyle = window.getComputedStyle(film);
  const animationTime = parseCssTime(filmStyle.animationDuration) + parseCssTime(filmStyle.animationDelay);
  fallbackTimer = window.setTimeout(finishIntro, Math.max(1000, animationTime + 700));

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
