(() => {
  const CONFIG = window.VALENTINE_CONFIG || {};

  // Distances in px for how scared the No button is of the cursor
  const NEAR_RADIUS_FAST = 140;
  const NEAR_RADIUS_MED = 260;

  // Timings (ms) for movement steps
  const SLOW_DELAY = 900; // far from cursor – lazy drifting
  const MED_DELAY = 320; // medium distance
  const FAST_DELAY = 120; // cursor is very close – run!

  const VIEW_MARGIN = 24; // keep the button away from exact edges
  const ESCAPE_NEAR = 260;
  const ESCAPE_MED = 180;

  let currentView = "landing";
  let typewriterTimer = null;

  // No button motion state
  let noActivated = false; // flips on first attempt to click/hover No
  let noMoveTimeoutId = null;
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

  // ----- Content wiring -----

  function initContent() {
    const landingTitle = document.getElementById("landing-title");
    const landingSubtitle = document.getElementById("landing-subtitle");
    const yesButton = document.getElementById("yes-button");
    const noButton = document.getElementById("no-button");
    const letterTitle = document.getElementById("letter-title");

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
    const container = document.getElementById("photos-container");
    if (!container) return;
    container.innerHTML = "";

    const photos = Array.isArray(CONFIG.photos) ? CONFIG.photos : [];
    if (!photos.length) {
      container.textContent = "You can add some of our favorite photos here ❤️";
      return;
    }

    photos.forEach((photo) => {
      const tile = document.createElement("div");
      tile.className = "photo-tile";

      const img = document.createElement("img");
      img.loading = "lazy";
      img.alt = photo.caption || "Photo of us";
      img.src = photo.src;

      const caption = document.createElement("div");
      caption.className = "photo-caption";
      caption.textContent = photo.caption || "";

      tile.appendChild(img);
      tile.appendChild(caption);
      container.appendChild(tile);
    });
  }

  // ----- Yes flow -----

  function startTypewriter() {
    const letterBody = document.getElementById("letter-body");
    if (!letterBody) return;

    const paragraphs = (CONFIG.letter && CONFIG.letter.paragraphs) || [];
    const fullText = paragraphs.join("\n\n");

    if (!CONFIG.features || !CONFIG.features.enableTypewriter) {
      letterBody.textContent = fullText;
      return;
    }

    letterBody.textContent = "";
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

  function triggerHeartConfetti() {
    const count = 16;
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    for (let i = 0; i < count; i += 1) {
      const span = document.createElement("span");
      span.className = "heart-confetti";

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

  function showYesScreen() {
    if (currentView === "yes") return;
    currentView = "yes";

    const landing = document.getElementById("landing-screen");
    const yesScreen = document.getElementById("yes-screen");

    landing.classList.remove("screen--active");
    landing.classList.add("screen--hidden");
    landing.setAttribute("aria-hidden", "true");

    yesScreen.classList.remove("screen--hidden");
    yesScreen.classList.add("screen--active");
    yesScreen.setAttribute("aria-hidden", "false");

    document.body.classList.add("yes-mode");

    startTypewriter();
    if (CONFIG.features && CONFIG.features.enableConfettiOnYes) {
      triggerHeartConfetti();
    }
  }

  // ----- No button wandering -----

  function anchorNoButton() {
    const noButton = document.getElementById("no-button");
    if (!noButton) return;
    const rect = noButton.getBoundingClientRect();
    noButton.classList.add("btn--no-moving"); // position: fixed from CSS
    noButton.style.left = `${rect.left}px`;
    noButton.style.top = `${rect.top}px`;
  }

  function moveNoButtonTo(centerX, centerY) {
    const noButton = document.getElementById("no-button");
    if (!noButton) return;
    const rect = noButton.getBoundingClientRect();
    const margin = window.innerWidth < 500 ? 32 : VIEW_MARGIN;

    const minX = margin + rect.width / 2;
    const maxX = Math.max(minX, window.innerWidth - margin - rect.width / 2);
    const minY = margin + rect.height / 2;
    const maxY = Math.max(minY, window.innerHeight - margin - rect.height / 2);

    const clampedX = clamp(centerX, minX, maxX);
    const clampedY = clamp(centerY, minY, maxY);

    noButton.style.left = `${clampedX - rect.width / 2}px`;
    noButton.style.top = `${clampedY - rect.height / 2}px`;
  }

  function scheduleNextNoMove() {
    if (!noActivated || currentView !== "landing") return;

    const noButton = document.getElementById("no-button");
    if (!noButton) return;
    const rect = noButton.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let distToPointer = Infinity;
    if (lastPointerX != null && lastPointerY != null) {
      distToPointer = distance(centerX, centerY, lastPointerX, lastPointerY);
    }

    let delay = SLOW_DELAY;
    let targetX = centerX;
    let targetY = centerY;

    const margin = window.innerWidth < 500 ? 32 : VIEW_MARGIN;
    // Helper for a gentle random drift target
    const randomOnScreen = () => {
      const minX = margin + rect.width / 2;
      const maxX = Math.max(minX, window.innerWidth - margin - rect.width / 2);
      const minY = margin + rect.height / 2;
      const maxY = Math.max(minY, window.innerHeight - margin - rect.height / 2);
      return {
        x: Math.random() * (maxX - minX) + minX,
        y: Math.random() * (maxY - minY) + minY,
      };
    };

    if (distToPointer < NEAR_RADIUS_FAST) {
      // Very close: sprint away from the cursor
      delay = FAST_DELAY;
      let dirX = centerX - lastPointerX;
      let dirY = centerY - lastPointerY;
      const len = Math.hypot(dirX, dirY) || 1;
      dirX /= len;
      dirY /= len;
      targetX = centerX + dirX * ESCAPE_NEAR;
      targetY = centerY + dirY * ESCAPE_NEAR;
    } else if (distToPointer < NEAR_RADIUS_MED) {
      // Medium close: jog away
      delay = MED_DELAY;
      let dirX = centerX - lastPointerX;
      let dirY = centerY - lastPointerY;
      const len = Math.hypot(dirX, dirY) || 1;
      dirX /= len;
      dirY /= len;
      targetX = centerX + dirX * ESCAPE_MED;
      targetY = centerY + dirY * ESCAPE_MED;
    } else {
      // Far away: slow random drifting
      delay = SLOW_DELAY;
      const pos = randomOnScreen();
      targetX = pos.x;
      targetY = pos.y;
    }

    moveNoButtonTo(targetX, targetY);

    if (noMoveTimeoutId) {
      window.clearTimeout(noMoveTimeoutId);
    }
    noMoveTimeoutId = window.setTimeout(scheduleNextNoMove, delay);
  }

  function activateNoButtonMotion(initialPointerEvent) {
    if (noActivated) return;
    noActivated = true;

    if (initialPointerEvent && initialPointerEvent.clientX != null) {
      lastPointerX = initialPointerEvent.clientX;
      lastPointerY = initialPointerEvent.clientY;
    }

    anchorNoButton();
    scheduleNextNoMove();
  }

  function attachNoButtonDefenses() {
    const noButton = document.getElementById("no-button");
    const yesButton = document.getElementById("yes-button");
    if (!noButton || !yesButton) return;

    // First contact attempts (hover/focus) activate the wandering state
    ["pointerenter", "mouseenter", "focus"].forEach((eventName) => {
      noButton.addEventListener(eventName, (event) => {
        event.preventDefault();
        event.stopPropagation();
        activateNoButtonMotion(event);
        yesButton.focus();
      });
    });

    // Block actual clicks / taps and also keep it moving
    ["pointerdown", "click", "touchstart"].forEach((eventName) => {
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
    if (currentView !== "landing") return;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
  }

  // ----- Init -----

  function init() {
    initContent();

    const yesButton = document.getElementById("yes-button");
    yesButton.addEventListener("click", () => {
      if (currentView === "yes") return;
      showYesScreen();
    });

    attachNoButtonDefenses();

    window.addEventListener("pointermove", handlePointerMove);

    window.addEventListener("resize", () => {
      // Re-anchor if layout changes significantly
      if (!noActivated) return;
      anchorNoButton();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

