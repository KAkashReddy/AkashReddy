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

// Scroll-driven opening sequence for the portfolio.
(() => {
  const film = document.getElementById('launch-film');
  const stage = document.getElementById('film-stage');
  const site = document.getElementById('site-content');
  const skip = document.getElementById('film-skip');
  if (!film || !stage || !site || !skip) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) {
    film.hidden = true;
    site.inert = false;
    return;
  }

  const clamp = (value) => Math.min(1, Math.max(0, value));
  const easeOut = (value) => 1 - Math.pow(1 - clamp(value), 3);
  const ramp = (progress, start, end) => easeOut((progress - start) / (end - start));
  let scheduledFrame = 0;
  let completed = false;
  let focusAfterSkip = false;

  const completeIntro = () => {
    if (completed) return;
    completed = true;
    const introHeight = film.offsetHeight;
    const nextScrollY = Math.max(0, window.scrollY - introHeight);
    film.hidden = true;
    site.inert = false;
    window.removeEventListener('scroll', scheduleUpdate);
    window.removeEventListener('resize', scheduleUpdate);

    const root = document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo(0, nextScrollY);
    root.style.scrollBehavior = previousScrollBehavior;

    if (focusAfterSkip) document.querySelector('.site-header .wordmark')?.focus({ preventScroll: true });
  };

  const updateFilm = () => {
    if (completed) return;
    const progress = clamp(-film.getBoundingClientRect().top / film.offsetHeight);
    const kicker = ramp(progress, 0.015, 0.13);
    const caption = ramp(progress, 0.28, 0.44);
    const exit = ramp(progress, 0.71, 0.98);
    const mobileEmblemOpacity = window.matchMedia('(max-width: 700px)').matches ? 0.55 : 1;
    const emblemOpacity = mobileEmblemOpacity * (1 - ramp(progress, 0.64, 0.86));
    const lineStarts = [0.025, 0.105, 0.185];

    stage.style.setProperty('--film-kicker-opacity', kicker.toFixed(3));
    stage.style.setProperty('--film-kicker-y', `${((1 - kicker) * 18).toFixed(1)}px`);
    stage.style.setProperty('--film-caption-opacity', caption.toFixed(3));
    stage.style.setProperty('--film-caption-y', `${((1 - caption) * 18).toFixed(1)}px`);
    lineStarts.forEach((start, index) => {
      const reveal = ramp(progress, start, start + 0.16);
      const property = ['--film-line-one-offset', '--film-line-two-offset', '--film-line-three-offset'][index];
      stage.style.setProperty(property, `${((1 - reveal) * 115).toFixed(1)}%`);
    });
    stage.style.setProperty('--film-emblem-rotation', `${(progress * 150).toFixed(1)}deg`);
    stage.style.setProperty('--film-emblem-counter-rotation', `${(-progress * 90).toFixed(1)}deg`);
    stage.style.setProperty('--film-emblem-opacity', emblemOpacity.toFixed(3));
    stage.style.setProperty('--film-wipe', exit.toFixed(3));
    stage.style.setProperty('--film-exit-y', `${(-exit * 8).toFixed(1)}vh`);
    stage.style.setProperty('--film-stage-opacity', `${(1 - exit * 0.08).toFixed(3)}`);
    stage.style.setProperty('--film-progress-width', `${(progress * 100).toFixed(2)}%`);

    if (progress >= 0.985) {
      completeIntro();
      return;
    }
    if (!site.inert) site.inert = true;
  };

  const scheduleUpdate = () => {
    if (scheduledFrame) return;
    scheduledFrame = window.requestAnimationFrame(() => {
      scheduledFrame = 0;
      updateFilm();
    });
  };

  const skipIntro = () => {
    focusAfterSkip = true;
    completeIntro();
  };

  skip.addEventListener('click', skipIntro);
  film.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') skipIntro();
  });

  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate);
  updateFilm();
})();
