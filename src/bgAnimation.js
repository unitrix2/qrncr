// Studio Aurora & Reactive Holographic Background
// Produces an unforgettable, luxury creative workstation atmosphere with undulating aurora mesh and reactive particles.

export function initBackground(canvas) {
  const ctx = canvas.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  let w = 0, h = 0, dpr = 1;
  let mouse = { x: -1000, y: -1000, tx: -1000, ty: -1000 };
  let raf = 0, last = 0, start = performance.now();
  let enabled = document.documentElement.dataset.motion !== 'off';

  // Floating ambient light nodes
  const nodes = [
    { x: 0.2, y: 0.15, r: 350, c: [0, 245, 160], speed: 0.0006, phase: 0 },
    { x: 0.8, y: 0.2, r: 400, c: [0, 216, 246], speed: 0.0005, phase: 2 },
    { x: 0.5, y: 0.85, r: 450, c: [99, 102, 241], speed: 0.0004, phase: 4 },
  ];

  // Micro particle dust
  const particles = [];
  for (let i = 0; i < 40; i++) {
    particles.push({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 2 + 0.6,
      vx: (Math.random() - 0.5) * 0.0002,
      vy: (Math.random() - 0.5) * 0.0002,
      alpha: Math.random() * 0.5 + 0.2,
      pulse: Math.random() * Math.PI * 2,
    });
  }

  function layout() {
    dpr = window.devicePixelRatio || 1;
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }

  function frame(now) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const isLight = document.documentElement.dataset.theme === 'light';
    const t = now - start;

    // Mouse interpolation
    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;

    // 1. Render Aurora Light Orbs
    for (const node of nodes) {
      const nx = (node.x + Math.sin(t * node.speed + node.phase) * 0.1) * w;
      const ny = (node.y + Math.cos(t * node.speed * 0.8 + node.phase) * 0.08) * h;
      
      const g = ctx.createRadialGradient(nx, ny, 0, nx, ny, node.r);
      const alpha = isLight ? 0.05 : 0.09;
      g.addColorStop(0, `rgba(${node.c.join(',')}, ${alpha})`);
      g.addColorStop(0.5, `rgba(${node.c.join(',')}, ${alpha * 0.4})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(nx, ny, node.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Interactive Cursor Light
    if (mouse.x > 0 && mouse.y > 0) {
      const cg = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 280);
      const cAlpha = isLight ? 0.04 : 0.08;
      cg.addColorStop(0, `rgba(0, 245, 160, ${cAlpha})`);
      cg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 280, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Floating Micro Dust
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = 1;
      if (p.x > 1) p.x = 0;
      if (p.y < 0) p.y = 1;
      if (p.y > 1) p.y = 0;

      const px = p.x * w;
      const py = p.y * h;
      const pulseA = Math.sin(t * 0.002 + p.pulse) * 0.2 + 0.8;
      const pAlpha = isLight ? p.alpha * 0.3 : p.alpha * pulseA * 0.6;

      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fillStyle = isLight ? `rgba(16, 185, 129, ${pAlpha})` : `rgba(0, 245, 160, ${pAlpha})`;
      ctx.fill();
    }
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (now - last < 1000 / 40) return;
    last = now;
    frame(now);
  }

  function run() {
    cancelAnimationFrame(raf);
    if (!enabled || reduce.matches || document.hidden) {
      frame(1000);
      return;
    }
    raf = requestAnimationFrame(loop);
  }

  window.addEventListener('resize', () => { layout(); run(); });
  window.addEventListener('mousemove', (e) => {
    mouse.tx = e.clientX;
    mouse.ty = e.clientY;
  });
  document.addEventListener('visibilitychange', run);

  layout();
  run();

  return {
    setEnabled(v) {
      enabled = v;
      run();
    },
  };
}
