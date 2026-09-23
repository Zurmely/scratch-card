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
  const brush = { min: 28, max: 46 };
  const revealAt = 0.46;

  let dpr = 1;
  let drawing = false;
  let revealed = false;
  let last = null;
  let confetti = [];
  let sparkles = [];
  let progressQueued = false;

  function sizeCanvas(canvas, context, cssWidth, cssHeight) {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(cssWidth * dpr));
    canvas.height = Math.max(1, Math.round(cssHeight * dpr));
    canvas.style.width = "";
    canvas.style.height = "";
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

    ctx.save();
    ctx.strokeStyle = "rgba(90, 42, 12, 0.18)";
    ctx.lineWidth = 2;
    ctx.strokeRect(14, 14, w - 28, h - 28);
    ctx.restore();
  }

  function setupFoil() {
    if (revealed) return;
    const rect = foil.getBoundingClientRect();
    sizeCanvas(foil, foilCtx, rect.width, rect.height);
    paintFoil();
  }

  function setupFullbleed(canvas, context) {
    sizeCanvas(canvas, context, window.innerWidth, window.innerHeight);
  }

  function pointerPos(event) {
    const rect = foil.getBoundingClientRect();
    const point = "touches" in event ? event.touches[0] || event.changedTouches[0] : event;
    return {
      x: point.clientX - rect.left,
      y: point.clientY - rect.top,
    };
  }

  function scratchAt(from, to) {
    const ctx = foilCtx;
    const radius = brush.min + Math.random() * (brush.max - brush.min);
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = radius * 2;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(to.x, to.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function scratchedRatio() {
    const { width, height } = foil;
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
    return clear / total;
  }

  function tiltCard(event) {
    if (revealed || reducedMotion) return;
    const rect = card.getBoundingClientRect();
    const point = "touches" in event ? event.touches[0] : event;
    if (!point) return;
    const px = (point.clientX - rect.left) / rect.width - 0.5;
    const py = (point.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `rotateY(${px * 8}deg) rotateX(${-py * 8}deg)`;
  }

  function resetTilt() {
    card.style.transform = "";
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
    foilHint.classList.add("is-hidden");
    card.classList.add("is-revealed");
    resetTilt();

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
    last = pointerPos(event);
    foilHint.classList.add("is-hidden");
    scratchAt(last, last);
    tiltCard(event);
    if (navigator.vibrate) navigator.vibrate(8);
  }

  function move(event) {
    if (!drawing || revealed) return;
    event.preventDefault();
    const next = pointerPos(event);
    scratchAt(last, next);
    last = next;
    tiltCard(event);
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
    resetTilt();
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

  foil.addEventListener("pointerdown", start, { passive: false });
  window.addEventListener("pointermove", move, { passive: false });
  window.addEventListener("pointerup", end, { passive: false });
  window.addEventListener("pointercancel", end, { passive: false });
  foil.addEventListener("touchstart", start, { passive: false });
  window.addEventListener("touchmove", move, { passive: false });
  window.addEventListener("touchend", end, { passive: false });
  window.addEventListener("resize", onResize);

  onResize();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => onResize());
  }
  requestAnimationFrame(onResize);
  loop();
})();
