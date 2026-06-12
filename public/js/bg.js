/* Живой фон: тонкие созвездия — дрейфующие звёзды и линии между близкими.
   Лёгкий (≈45 точек), 60fps, останавливается при скрытой вкладке. */
export function startBackground() {
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, dpr = 1;
  let stars = [];
  let raf = 0;

  const isDark = () => document.documentElement.classList.contains('dark');

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = innerWidth; h = innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(48, Math.round((w * h) / 16000));
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.16,
      vy: (Math.random() - 0.5) * 0.16,
      r: Math.random() * 1.6 + 0.6,
      tw: Math.random() * Math.PI * 2,
      sun: Math.random() < 0.18, // редкие тёплые звёзды
    }));
  }

  function tick() {
    ctx.clearRect(0, 0, w, h);
    const dark = isDark();
    const linkDist = 110;

    for (const s of stars) {
      s.x += s.vx; s.y += s.vy; s.tw += 0.02;
      if (s.x < -10) s.x = w + 10; if (s.x > w + 10) s.x = -10;
      if (s.y < -10) s.y = h + 10; if (s.y > h + 10) s.y = -10;
    }

    // Линии-созвездия
    ctx.lineWidth = 1;
    for (let i = 0; i < stars.length; i++) {
      for (let j = i + 1; j < stars.length; j++) {
        const a = stars[i], b = stars[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < linkDist * linkDist) {
          const alpha = (1 - Math.sqrt(d2) / linkDist) * (dark ? 0.14 : 0.10);
          ctx.strokeStyle = `rgba(${dark ? '120,170,255' : '45,140,255'},${alpha})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // Звёзды с мерцанием
    for (const s of stars) {
      const twinkle = 0.55 + Math.sin(s.tw) * 0.35;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, 7);
      ctx.fillStyle = s.sun
        ? `rgba(245,166,35,${(dark ? 0.5 : 0.4) * twinkle})`
        : `rgba(${dark ? '140,185,255' : '45,140,255'},${(dark ? 0.55 : 0.35) * twinkle})`;
      ctx.fill();
    }

    raf = requestAnimationFrame(tick);
  }

  resize();
  tick();
  addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else tick();
  });
}
