(() => {
  const CONFIG = window.VALENTINE_CONFIG || {};

  // Distances in px for how scared the No button is of the cursor
  const NEAR_RADIUS_FAST = 150;
  const NEAR_RADIUS_MED = 260;

  // Speeds in px/second
  const BASE_WANDER_SPEED = 28; // slow drift when cursor is far
  const MED_WANDER_SPEED = 100;
  const FAST_WANDER_SPEED = 260; // when cursor is chasing

  const VIEW_MARGIN = 24; // keep button comfortably inside viewport edges
  const MAX_MOVE_ATTEMPTS = 32;
  const MIN_DISTANCE_FROM_YES = 110; // keep away from Yes button a bit

  let currentView = 'landing';
  let typewriterTimer = null;

  // No button motion state
  let noActivated = false; // flips on first attempt to click No
  let noWanderTimeoutId = null; // interval-style wandering
  let noWanderRafId = null; // legacy, kept unused
  let noLogicalPos = null; // legacy, kept for compatibility
  let noTargetPos = null; // legacy, kept for compatibility
  let lastFrameTime = null; // legacy, kept for compatibility
  let lastPointerX = null;
  let lastPointerY = null;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function distance(x1, y1, x2, y2) {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return Math.hypot(dx, dy);
  }

  function initContent() {
    const landingTitle = document.getElementById('landing-title');
    const landingSubtitle = document.getElementById('landing-subtitle');
    const yesButton = document.getElementById('yes-button');
    const noButton = document.getElementById('no-button');
    const letterTitle = document.getElementById('letter-title');

    const cfgLanding = CONFIG.landing || {};
    const cfgLetter = CONFIG.letter || {};

    if (cfgLanding.title) landingTitle.textContent = cfgLanding.title;
    if (cfgLanding.subtitle) landingSubtitle.textContent = cfgLanding.subtitle;
    if (cfgLanding.yesLabel) yesButton.textContent = cfgLanding.yesLabel;
    if (cfgLanding.noLabel) noButton.textContent = cfgLanding.noLabel;

    if (cfgLetter.title) letterTitle.textContent = cfgLetter.title;

    renderPhotos();
  }

  function renderPhotos() {
    const container = document.getElementById('photos-container');
    if (!container) return;
    container.innerHTML = '';

    const photos = Array.isArray(CONFIG.photos) ? CONFIG.photos : [];
    if (!photos.length) {
      container.textContent = 'You can add some of our favorite photos here ❤️';
      return;
    }

    photos.forEach((photo) => {
      const tile = document.createElement('div');
      tile.className = 'photo-tile';

      const img = document.createElement('img');
      img.loading = 'lazy';
      img.alt = photo.caption || 'Photo of us';
      img.src = photo.src;

      const caption = document.createElement('div');
      caption.className = 'photo-caption';
      caption.textContent = photo.caption || '';

      tile.appendChild(img);
      tile.appendChild(caption);
      container.appendChild(tile);
    });
  }

  function startTypewriter() {
    const letterBody = document.getElementById('letter-body');
    if (!letterBody) return;

    const paragraphs = (CONFIG.letter && CONFIG.letter.paragraphs) || [];
    const fullText = paragraphs.join('\n\n');

    if (!CONFIG.features || !CONFIG.features.enableTypewriter) {
      letterBody.textContent = fullText;
      return;
    }

    // Typewriter effect
    letterBody.textContent = '';
    const totalDurationMs = 4500;
    const minInterval = 12;
    const maxInterval = 40;
    const approximateInterval = fullText.length
      ? clamp(Math.floor(totalDurationMs / fullText.length), minInterval, maxInterval)
      : 20;

    let index = 0;
    typewriterTimer = window.setInterval(() => {
      if (index >= fullText.length) {
        window.clearInterval(typewriterTimer);
        typewriterTimer = null;
        return;
      }
      letterBody.textContent = fullText.slice(0, index + 1);
      index += 1;
    }, approximateInterval);
  }

  function showYesScreen() {
    if (currentView === 'yes') return;
    currentView = 'yes';

    const landing = document.getElementById('landing-screen');
    const yesScreen = document.getElementById('yes-screen');

    landing.classList.remove('screen--active');
    landing.classList.add('screen--hidden');
    landing.setAttribute('aria-hidden', 'true');

    yesScreen.classList.remove('screen--hidden');
    yesScreen.classList.add('screen--active');
    yesScreen.setAttribute('aria-hidden', 'false');

    document.body.classList.add('yes-mode');

    startTypewriter();
    if (CONFIG.features && CONFIG.features.enableConfettiOnYes) {
      triggerHeartConfetti();
    }
  }

  function triggerHeartConfetti() {
    const count = 16;
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    for (let i = 0; i < count; i += 1) {
      const span = document.createElement('span');
      span.className = 'heart-confetti';

      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
      const radius = 40 + Math.random() * 60;

      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      span.style.left = `${x}px`;
      span.style.top = `${y}px`;
      span.style.animationDelay = `${Math.random() * 0.2}s`;

      document.body.appendChild(span);

      setTimeout(() => {
        span.remove();
      }, 1800);
    }
  }

  function ensureNoLogicalPos() {
    if (noLogicalPos) return;
    const noButton = document.getElementById('no-button');
    if (!noButton) return;

    const noRect = noButton.getBoundingClientRect();
    const centerX = noRect.left + noRect.width / 2;
    const centerY = noRect.top + noRect.height / 2;

    // Store logical position in viewport coordinates
    noLogicalPos = { x: centerX, y: centerY };

    noButton.classList.add('btn--no-moving');
    noButton.style.left = `${centerX - noRect.width / 2}px`;
    noButton.style.top = `${centerY - noRect.height / 2}px`;
  }

  function pickRandomTarget(avoidPointer) {
    const yesButton = document.getElementById('yes-button');
    const noButton = document.getElementById('no-button');
    if (!yesButton || !noButton) return null;

    const yesRect = yesButton.getBoundingClientRect();
    const noRect = noButton.getBoundingClientRect();

    const minX = VIEW_MARGIN + noRect.width / 2;
    const maxX = window.innerWidth - VIEW_MARGIN - noRect.width / 2;
    const minY = VIEW_MARGIN + noRect.height / 2;
    const maxY = window.innerHeight - VIEW_MARGIN - noRect.height / 2;

    const yesCenterX = yesRect.left + yesRect.width / 2;
    const yesCenterY = yesRect.top + yesRect.height / 2;

    let best = null;
    for (let i = 0; i < MAX_MOVE_ATTEMPTS; i += 1) {
      const x = Math.random() * (maxX - minX) + minX;
      const y = Math.random() * (maxY - minY) + minY;

      const distToYes = distance(x, y, yesCenterX, yesCenterY);
      if (distToYes < MIN_DISTANCE_FROM_YES) continue;

      if (avoidPointer && lastPointerX != null && lastPointerY != null) {
        const distToPointer = distance(x, y, lastPointerX, lastPointerY);
        if (distToPointer < NEAR_RADIUS_MED) {
          // too close, skip
          continue;
        }
      }

      best = { x, y };
      break;
    }

    return best;
  }

  function updateNoButtonPositionFromLogical() {
    const noButton = document.getElementById('no-button');
    if (!noButton || !noLogicalPos) return;
    const noRect = noButton.getBoundingClientRect();

    const minLeft = VIEW_MARGIN;
    const maxLeft = Math.max(minLeft, window.innerWidth - VIEW_MARGIN - noRect.width);
    const minTop = VIEW_MARGIN;
    const maxTop = Math.max(minTop, window.innerHeight - VIEW_MARGIN - noRect.height);

    const left = clamp(
      noLogicalPos.x - noRect.width / 2,
      minLeft,
      maxLeft
    );
    const top = clamp(
      noLogicalPos.y - noRect.height / 2,
      minTop,
      maxTop
    );

    noButton.classList.add('btn--no-moving');
    noButton.style.left = `${left}px`;
    noButton.style.top = `${top}px`;
  }

  function wanderStep(timestamp) {
    if (!noActivated || currentView !== 'landing') {
      noWanderRafId = null;
      return;
    }

    if (lastFrameTime == null) {
      lastFrameTime = timestamp;
    }
    const dt = (timestamp - lastFrameTime) / 1000;
    lastFrameTime = timestamp;

    ensureNoLogicalPos();
    if (!noLogicalPos) {
      noWanderRafId = requestAnimationFrame(wanderStep);
      return;
    }

    // Decide speed based on distance to pointer
    let speed = BASE_WANDER_SPEED;
    let distToPointer = Infinity;

    if (lastPointerX != null && lastPointerY != null) {
      distToPointer = distance(noLogicalPos.x, noLogicalPos.y, lastPointerX, lastPointerY);

      if (distToPointer < NEAR_RADIUS_FAST) {
        speed = FAST_WANDER_SPEED;
      } else if (distToPointer < NEAR_RADIUS_MED) {
        speed = MED_WANDER_SPEED;
      }
    }

    // If pointer gets too close, immediately choose a target away from it
    const shouldAvoidPointer = distToPointer < NEAR_RADIUS_MED;
    if (!noTargetPos || shouldAvoidPointer) {
      noTargetPos = pickRandomTarget(shouldAvoidPointer);
    }

    if (!noTargetPos) {
      noWanderRafId = requestAnimationFrame(wanderStep);
      return;
    }

    const dx = noTargetPos.x - noLogicalPos.x;
    const dy = noTargetPos.y - noLogicalPos.y;
    const distToTarget = Math.hypot(dx, dy);

    if (distToTarget < 2) {
      // Close enough: pick a new lazy target
      noTargetPos = pickRandomTarget(false);
    } else {
      const maxStep = speed * dt;
      const ratio = maxStep / distToTarget;
      noLogicalPos.x += dx * Math.min(1, ratio);
      noLogicalPos.y += dy * Math.min(1, ratio);
    }

    updateNoButtonPositionFromLogical();

    noWanderRafId = requestAnimationFrame(wanderStep);
  }

  function activateNoButtonMotion(initialPointerEvent) {
    if (noActivated) return;
    noActivated = true;

    // Initialize positions relative to current pointer if available
    if (initialPointerEvent && initialPointerEvent.clientX != null) {
      lastPointerX = initialPointerEvent.clientX;
      lastPointerY = initialPointerEvent.clientY;
    }

    ensureNoLogicalPos();
    noTargetPos = pickRandomTarget(true);
    lastFrameTime = null;

    if (!noWanderRafId) {
      noWanderRafId = requestAnimationFrame(wanderStep);
    }
  }

  function attachNoButtonDefenses() {
    const noButton = document.getElementById('no-button');
    const yesButton = document.getElementById('yes-button');
    if (!noButton || !yesButton) return;

    // First contact attempts (hover/focus/click) activate the constant motion
    ['pointerenter', 'mouseenter', 'focus'].forEach((eventName) => {
      noButton.addEventListener(eventName, (event) => {
        event.preventDefault();
        event.stopPropagation();
        activateNoButtonMotion(event);
        yesButton.focus();
      });
    });

    // Block actual clicks / taps and also activate motion
    ['pointerdown', 'click', 'touchstart'].forEach((eventName) => {
      noButton.addEventListener(
        eventName,
        (event) => {
          event.preventDefault();
          event.stopImmediatePropagation();
          activateNoButtonMotion(event);
        },
        { passive: false }
      );
    });
  }

  function handlePointerMove(event) {
    if (currentView !== 'landing') return;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
  }

  function init() {
    initContent();

    const yesButton = document.getElementById('yes-button');

    yesButton.addEventListener('click', () => {
      if (currentView === 'yes') return;
      showYesScreen();
    });

    attachNoButtonDefenses();

    // Track pointer for dynamic speed / avoidance
    window.addEventListener('pointermove', handlePointerMove);

    // Reset cached rects on resize
    window.addEventListener('resize', () => {
      noLogicalPos = null;
      noTargetPos = null;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

