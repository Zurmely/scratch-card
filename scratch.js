(() => {
  const foil = document.getElementById("foil");
  const foilHint = document.getElementById("foilHint");
  const card = document.getElementById("card");
  const sparklesCanvas = document.getElementById("sparkles");
  const confettiCanvas = document.getElementById("confetti");

  const foilCtx = foil.getContext("2d", { willReadFrequently: true });
  const sparkleCtx = sparklesCanvas.getContext("2d");
  const confettiCtx = confettiCanvas.getContext("2d");

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const revealAt = 0.42;
  const brush = 36;

  let dpr = 1;
  let drawing = false;
  let revealed = false;
  let hasScratched = false;
  let last = null;
  let confetti = [];
  let sparkles = [];
  let progressQueued = false;
  let layoutTries = 0;
  let lastFoilW = 0;
  let lastFoilH = 0;

  function sizeCanvas(canvas, context, cssWidth, cssHeight) {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    canvas.width = Math.max(1, Math.round(cssWidth * dpr));
    canvas.height = Math.max(1, Math.round(cssHeight * dpr));
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function paintFoil() {
    const w = foil.clientWidth;
    const h = foil.clientHeight;
    const ctx = foilCtx;

    ctx.globalCompositeOperation = "source-over";
    const base = ctx.createLinearGradient(0, 0, w, h);
    base.addColorStop(0, "#f6e2a8");
    base.addColorStop(0.35, "#d7a441");
    base.addColorStop(0.7, "#f0c36a");
    base.addColorStop(1, "#c4892d");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);

    const sheen = ctx.createLinearGradient(0, 0, w, 0);
    sheen.addColorStop(0, "rgba(255,120,170,0.2)");
    sheen.addColorStop(0.5, "rgba(180,255,240,0.16)");
    sheen.addColorStop(1, "rgba(255,210,90,0.22)");
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = 0.16;
    for (let y = -h; y < h * 2; y += 6) {
      ctx.strokeStyle = y % 12 === 0 ? "#fff6d2" : "#8a5a12";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y + w * 0.18);
      ctx.stroke();
    }
    ctx.restore();

    ctx.fillStyle = "rgba(255, 236, 180, 0.18)";
    for (let i = 0; i < 140; i += 1) {
      ctx.fillRect(Math.random() * w, Math.random() * h, 1.4, 1.4);
    }

    ctx.save();
    ctx.strokeStyle = "rgba(255, 248, 220, 0.08)";
    ctx.lineWidth = 1;
    for (let x = 18; x < w; x += 28) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    ctx.restore();

    ctx.fillStyle = "rgba(72, 32, 10, 0.08)";
    for (let i = 0; i < 16; i += 1) {
      ctx.beginPath();
      ctx.arc(Math.random() * w, Math.random() * h, 10 + Math.random() * 28, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = "rgba(90, 42, 12, 0.18)";
    ctx.lineWidth = 2;
    ctx.strokeRect(14, 14, Math.max(0, w - 28), Math.max(0, h - 28));
  }

  function setupFoil() {
    if (revealed || hasScratched) return;
    const cardRect = card.getBoundingClientRect();
    const cssW = cardRect.width - 20;
    const cssH = cardRect.height - 20;
    if ((cssW < 8 || cssH < 8) && layoutTries < 60) {
      layoutTries += 1;
      requestAnimationFrame(setupFoil);
      return;
    }
    if (Math.abs(cssW - lastFoilW) < 1 && Math.abs(cssH - lastFoilH) < 1 && foil.width > 1) {
      return;
    }
    lastFoilW = cssW;
    lastFoilH = cssH;
    sizeCanvas(foil, foilCtx, cssW, cssH);
    paintFoil();
    foil.style.background = "transparent";
  }

  function setupFullbleed(canvas, context) {
    sizeCanvas(canvas, context, window.innerWidth, window.innerHeight);
  }

  function pointerPos(event) {
    const rect = foil.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function scratchAt(from, to) {
    const ctx = foilCtx;
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = brush * 2;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(to.x, to.y, brush, 0, Math.PI * 2);
    ctx.fill();
  }

  function scratchedRatio() {
    const { width, height } = foil;
    if (!width || !height) return 0;
    const data = foilCtx.getImageData(0, 0, width, height).data;
    const step = 16;
    let clear = 0;
    let total = 0;
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        total += 1;
        if (data[(y * width + x) * 4 + 3] < 18) clear += 1;
      }
    }
    return total ? clear / total : 0;
  }

  function celebrate() {
    const colors = ["#f4d58d", "#ff6b9d", "#fff4e3", "#c9a227", "#ffd1e1", "#7c3aed"];
    const count = reducedMotion ? 24 : 110;
    confetti = Array.from({ length: count }, () => ({
      x: window.innerWidth * 0.5 + (Math.random() - 0.5) * 80,
      y: window.innerHeight * 0.42,
      vx: (Math.random() - 0.5) * 11,
      vy: -6 - Math.random() * 8,
      size: 5 + Math.random() * 7,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      color: colors[Math.floor(Math.random() * colors.length)],
      kind: Math.random() > 0.55 ? "rect" : "circle",
    }));
  }

  function reveal() {
    if (revealed) return;
    revealed = true;
    if (foilHint) foilHint.classList.add("is-hidden");
    card.classList.add("is-revealed");

    const fade = () => {
      foilCtx.save();
      foilCtx.globalCompositeOperation = "destination-out";
      foilCtx.fillStyle = "rgba(0,0,0,0.18)";
      foilCtx.fillRect(0, 0, foil.clientWidth, foil.clientHeight);
      foilCtx.restore();
    };

    if (reducedMotion) {
      foilCtx.clearRect(0, 0, foil.clientWidth, foil.clientHeight);
    } else {
      let frames = 0;
      const tick = () => {
        fade();
        frames += 1;
        if (frames < 18) requestAnimationFrame(tick);
        else foilCtx.clearRect(0, 0, foil.clientWidth, foil.clientHeight);
      };
      tick();
    }

    if (navigator.vibrate) navigator.vibrate([12, 40, 18]);
    celebrate();
  }

  function start(event) {
    if (revealed) return;
    event.preventDefault();
    drawing = true;
    hasScratched = true;
    last = pointerPos(event);
    if (foilHint) foilHint.classList.add("is-hidden");
    if (card.setPointerCapture && event.pointerId != null) {
      try {
        card.setPointerCapture(event.pointerId);
      } catch {
        /* ignore */
      }
    }
    scratchAt(last, last);
    if (navigator.vibrate) navigator.vibrate(8);
  }

  function move(event) {
    if (!drawing || revealed) return;
    event.preventDefault();
    const next = pointerPos(event);
    scratchAt(last, next);
    last = next;
    if (!progressQueued) {
      progressQueued = true;
      requestAnimationFrame(() => {
        progressQueued = false;
        if (!revealed && scratchedRatio() >= revealAt) reveal();
      });
    }
  }

  function end(event) {
    if (!drawing) return;
    if (event) event.preventDefault();
    drawing = false;
    last = null;
    if (!revealed && scratchedRatio() >= revealAt) reveal();
  }

  function makeSparkles() {
    sparkles = Array.from({ length: 36 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: 0.6 + Math.random() * 1.6,
      a: Math.random(),
      s: 0.004 + Math.random() * 0.01,
    }));
  }

  function drawSparkles() {
    sparkleCtx.clearRect(0, 0, sparklesCanvas.clientWidth, sparklesCanvas.clientHeight);
    sparkles.forEach((dot) => {
      dot.a += dot.s;
      const alpha = 0.15 + Math.abs(Math.sin(dot.a)) * 0.55;
      sparkleCtx.fillStyle = `rgba(244, 213, 141, ${alpha})`;
      sparkleCtx.beginPath();
      sparkleCtx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
      sparkleCtx.fill();
    });
  }

  function drawConfetti() {
    confettiCtx.clearRect(0, 0, confettiCanvas.clientWidth, confettiCanvas.clientHeight);
    confetti = confetti.filter((p) => p.y < window.innerHeight + 40);
    confetti.forEach((p) => {
      p.vy += 0.18;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      confettiCtx.save();
      confettiCtx.translate(p.x, p.y);
      confettiCtx.rotate(p.rot);
      confettiCtx.fillStyle = p.color;
      if (p.kind === "rect") confettiCtx.fillRect(-p.size * 0.35, -p.size * 0.7, p.size * 0.7, p.size * 1.4);
      else {
        confettiCtx.beginPath();
        confettiCtx.arc(0, 0, p.size * 0.45, 0, Math.PI * 2);
        confettiCtx.fill();
      }
      confettiCtx.restore();
    });
  }

  function loop() {
    drawSparkles();
    drawConfetti();
    requestAnimationFrame(loop);
  }

  function onResize() {
    setupFullbleed(sparklesCanvas, sparkleCtx);
    setupFullbleed(confettiCanvas, confettiCtx);
    makeSparkles();
    setupFoil();
  }

  card.addEventListener("pointerdown", start, { passive: false });
  card.addEventListener("pointermove", move, { passive: false });
  card.addEventListener("pointerup", end, { passive: false });
  card.addEventListener("pointercancel", end, { passive: false });
  window.addEventListener("resize", onResize);
  if (typeof ResizeObserver === "function") {
    const observer = new ResizeObserver(() => setupFoil());
    observer.observe(card);
  }

  const startLayout = () => {
    onResize();
    requestAnimationFrame(setupFoil);
  };

  if (document.readyState === "complete") startLayout();
  else window.addEventListener("load", startLayout, { once: true });
  startLayout();
  loop();
})();
