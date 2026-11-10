(() => {
  const videos = [...document.querySelectorAll('video.device-screen')];
  const story = document.querySelector('.demo-story');
  const steps = [...story.querySelectorAll('.demo-step')];
  const devices = steps.map(step => step.querySelector('.device'));
  const replayButtons = [...document.querySelectorAll('.demo-replay')];
  const topicReplays = steps.map(step => step.querySelector('.demo-replay'));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const stacked = matchMedia('(max-width: 800px)');
  const visible = new Set();
  const inView = new Set();
  const blocked = new Set();
  const controls = new Map(replayButtons.map(button => [document.getElementById(button.getAttribute('aria-controls')), button]));
  const autoplayOff = () => reduced.matches || navigator.connection?.saveData === true;
  let manualVideo;
  let pin;
  let stage;
  let folds = [];
  let foldObserver;
  let foldFailed = false;

  let activeTopic;
  let scheduled = false;

  function updateControl(video) {
    const button = controls.get(video);
    const ending = video.ended || (!video.paused && video.duration - video.currentTime <= .35);
    const start = !ending && video.paused && (autoplayOff() || blocked.has(video));
    const ready = ending || start;
    button.classList.toggle('is-ready', ready);
    button.classList.toggle('is-start', start);
    button.inert = !ready;
    const label = start ? button.dataset.replayLabel.replace(/^Replay /, 'Play ') : button.dataset.replayLabel;
    button.setAttribute('aria-label', label);
    button.title = label;
  }
  function syncVideo(video) {
    const inactive = stage && video.dataset.demo && video.dataset.demo !== activeTopic;
    const showing = !inactive && visible.has(video) && video.getClientRects().length > 0;
    if (!showing) {
      inView.delete(video);
      if (manualVideo === video) manualVideo = undefined;
      video.pause();
      return;
    }
    if (!inView.has(video)) {
      inView.add(video);
      if (video.readyState >= 1 && video.currentTime > 0) video.currentTime = 0;
    }
    if (((autoplayOff() || blocked.has(video)) && manualVideo !== video) || document.hidden) {
      video.pause();
      return;
    }
    if (video.ended || !video.paused) return;
    playVideo(video);
  }
  function playVideo(video) {
    const source = video.querySelector('source');
    if (!source.src) { source.src = source.dataset.src; video.load(); }
    video.play().catch(error => {
      if (error.name === 'AbortError' || video.paused && !video.getClientRects().length) return;
      blocked.add(video);
      updateControl(video);
    });
  }
  function loadFold(fold) {
    if (fold.movie.hasAttribute('src')) return;
    fold.movie.preload = 'auto';
    fold.movie.src = fold.src;
    fold.movie.load();
  }
  function seekFold(fold) {
    const movie = fold.movie;
    if (movie.seeking || movie.readyState < 1) return;
    const lastFrame = movie.duration - 1 / 30;
    if (!Number.isFinite(lastFrame) || lastFrame <= 0) return;
    const target = Math.round(fold.progress * lastFrame * 30) / 30;
    if (Math.abs(target - movie.currentTime) > 1 / 60) movie.currentTime = target;
  }
  function makeFold(src, name) {
    const movie = document.createElement('video');
    movie.className = 'fold-movie ' + name;
    movie.muted = true;
    movie.playsInline = true;
    movie.preload = 'none';
    movie.setAttribute('aria-hidden', 'true');
    stage.prepend(movie);
    const fold = {movie, src, progress: 0};
    movie.addEventListener('loadedmetadata', () => seekFold(fold));
    movie.addEventListener('loadeddata', () => {
      if (!movie.isConnected) return;
      movie.classList.add('ready');
      requestUpdate();
    });
    movie.addEventListener('seeked', () => seekFold(fold));
    movie.addEventListener('error', () => {
      if (!movie.isConnected) return;
      foldFailed = true;
      setLayout();
    });
    return fold;
  }

  function updateStory() {
    scheduled = false;
    if (!stage) return;
    const centers = steps.map(step => {
      const r = step.getBoundingClientRect();
      return r.top + r.height / 2;
    });
    const anchor = stacked.matches
      ? Math.min(innerHeight * .84, pin.offsetHeight + (innerHeight - pin.offsetHeight) * .42)
      : innerHeight * .5;
    function transition(from, to) {
      const travel = (anchor - centers[from]) / (centers[to] - centers[from]);
      return Math.min(1, Math.max(0, (travel - .23) / .54));
    }
    const opening = transition(0, 1);
    const booking = transition(2, 3);
    const view = opening === 0 ? 'closed' : opening < 1 ? 'opening'
      : booking === 0 ? 'open' : booking < 1 ? 'folding-book' : 'book';
    const activeFold = folds[booking > 0 ? 1 : 0];
    stage.dataset.view = view;
    stage.dataset.nearer = booking > 0 ? (booking < .5 ? 'open' : 'book') : (opening < .5 ? 'closed' : 'open');
    folds[0].progress = opening;
    folds[1].progress = booking;
    if (view === 'opening' || view === 'folding-book') loadFold(activeFold);
    stage.classList.toggle('fold-ready', activeFold.movie.classList.contains('ready'));
    seekFold(activeFold);
    stage.style.setProperty('--cover-opacity', Math.max(0, 1 - opening / .08));
    stage.style.setProperty('--inner-opacity', Math.max(0, Math.min((opening - .9) / .1, 1 - booking / .08)));
    stage.style.setProperty('--book-opacity', Math.max(0, (booking - .9) / .1));
    const topic = view === 'closed' ? 'xss' : view === 'book' ? 'nlp' : view === 'open'
      ? (anchor < (centers[1] + centers[2]) / 2 ? 'transformer' : 'mdp') : '';
    const ml = anchor >= (centers[1] + centers[2]) / 2;
    devices[1].hidden = ml;
    devices[2].hidden = !ml;
    if (topic === activeTopic) return;
    activeTopic = topic;
    topicReplays.forEach((button, i) => { button.hidden = steps[i].dataset.topic !== topic; });
    videos.forEach(syncVideo);
  }
  function requestUpdate() {
    if (!stage || scheduled) return;
    scheduled = true;
    requestAnimationFrame(updateStory);
  }
  function setLayout() {
    if (reduced.matches || foldFailed || navigator.connection?.saveData === true) {
      if (stage) {
        steps.forEach((step, i) => {
          devices[i].hidden = false;
          topicReplays[i].hidden = false;
          step.querySelector('.demo-inline').append(devices[i], topicReplays[i]);
        });
        foldObserver?.disconnect();
        foldObserver = undefined;
        pin.remove();
        folds.forEach(({movie}) => { movie.removeAttribute('src'); movie.load(); });
        folds = [];
        story.classList.remove('has-stage');
        stage = pin = activeTopic = undefined;
      }
    } else if (!stage) {
      pin = document.createElement('div');
      pin.className = 'demo-pin';
      pin.innerHTML = '<div class="demo-stage"><div class="cover-display"></div><div class="open-display"></div><div class="book-display"></div></div><div class="demo-replays"></div>';
      stage = pin.querySelector('.demo-stage');
      folds = [makeFold(story.dataset.foldSrc, 'opening-movie'), makeFold(story.dataset.bookSrc, 'book-movie')];
      pin.querySelector('.book-display').append(devices[3]);
      pin.querySelector('.demo-replays').append(...topicReplays);
      pin.querySelector('.cover-display').append(devices[0]);
      pin.querySelector('.open-display').append(devices[1], devices[2]);
      if ('IntersectionObserver' in window) {
        foldObserver = new IntersectionObserver(entries => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            loadFold(folds[entry.target === steps[0] ? 0 : 1]);
            foldObserver.unobserve(entry.target);
          }
        }, { rootMargin: '480px 0px' });
        foldObserver.observe(steps[0]);
        foldObserver.observe(steps[2]);
      }
      story.prepend(pin);
      story.classList.add('has-stage');
      updateStory();
    }
    videos.forEach(syncVideo);
  }

  replayButtons.forEach(button => {
    const video = document.getElementById(button.getAttribute('aria-controls'));
    button.dataset.replayLabel = button.getAttribute('aria-label');
    button.hidden = false;
    for (const event of ['timeupdate', 'durationchange', 'seeking', 'play', 'pause', 'ended']) {
      video.addEventListener(event, () => updateControl(video));
    }
    updateControl(video);
    button.addEventListener('click', () => {
      if (manualVideo && manualVideo !== video) manualVideo.pause();
      manualVideo = video;
      if (video.readyState >= 1) video.currentTime = 0;
      blocked.delete(video);
      playVideo(video);
      updateControl(video);
    });
    video.addEventListener('ended', () => {
      if (manualVideo === video) manualVideo = undefined;
    });
  });
  videos.forEach(video => { video.autoplay = false; video.muted = true; });
  setLayout();
  reduced.addEventListener('change', () => {
    manualVideo = undefined;
    videos.forEach(updateControl);
    setLayout();
  });
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);
  window.addEventListener('pageshow', requestUpdate);
  if ('ResizeObserver' in window) new ResizeObserver(requestUpdate).observe(story);
  document.addEventListener('visibilitychange', () => videos.forEach(syncVideo));
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio >= .05) visible.add(entry.target);
        else visible.delete(entry.target);
        syncVideo(entry.target);
      });
    }, { threshold: .05 });
    videos.forEach(video => observer.observe(video));
  } else {
    videos.forEach(video => visible.add(video));
    videos.forEach(syncVideo);
  }
})();
