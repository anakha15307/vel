(() => {
  const { pose } = window.FloatLib;
  const { VELS } = window.VelsLib;

  // The config comes from the main process so user-added pictures work too.
  const start = async () => {
    const id = new URLSearchParams(location.search).get("vel");
    let remote = null;
    try {
      remote = await window.velApi.getVel(id);
    } catch {
      // main process unreachable; fall back to the built-in list below
    }
    const cfg = remote ?? VELS[id] ?? VELS.brass;
  const [W, H] = cfg.view;
  const [imageW, imageH] = cfg.image;
  const [cx, cy] = cfg.imageCenter ?? [W / 2, H / 2];

  const svg = document.getElementById("svg");
  const vel = document.getElementById("vel");
  const art = document.getElementById("art");
  const glow = document.getElementById("glow");
  const aura = document.getElementById("aura");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  art.setAttribute("href", cfg.file);
  art.setAttribute("x", -imageW / 2);
  art.setAttribute("y", -imageH / 2);
  art.setAttribute("width", imageW);
  art.setAttribute("height", imageH);
  glow.setAttribute("cx", cx);
  glow.setAttribute("cy", cy);
  glow.setAttribute("r", Math.min(W, H) * 0.52);
  aura.style.transformOrigin = `${cx}px ${cy}px`;
  if (cfg.glow === false) glow.style.display = "none";

  // The water falls from the top of the window (y = 0), which is -cy in picture coordinates.
  const water = cfg.water
    ? window.WaterLib.createWater(vel, { ...cfg.water, sourceY: -cy }, !reduced)
    : null;

  let spin = 0, spinStart = 0, prevT = 0;

  const frame = (ms) => {
    requestAnimationFrame(frame);
    const t = ms / 1000;
    const dt = prevT ? Math.min(t - prevT, 0.1) : 0;
    prevT = t;
    const p = reduced ? { y: 0, glow: 0.4 } : pose(t);
    let extra = 0;
    if (spin) {
      const k = (t - spinStart) / 1.2;
      if (k >= 1) spin = 0;
      else extra = 360 * (k * k * (3 - 2 * k));
    }
    vel.setAttribute("transform", `translate(${cx} ${(cy + p.y).toFixed(2)}) scale(${Math.cos((extra * Math.PI) / 180).toFixed(3)} 1)`);
    glow.setAttribute("opacity", p.glow.toFixed(3));
    water?.update(t, dt);
  };
  requestAnimationFrame(frame);

  // Click blesses (a slow turn around the vertical axis); drag moves the window.
  let down = null, moved = 0;
  document.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    down = { x: e.screenX, y: e.screenY }; moved = 0;
  });
  document.addEventListener("pointermove", (e) => {
    if (!down) return;
    const dx = e.screenX - down.x, dy = e.screenY - down.y;
    moved += Math.abs(dx) + Math.abs(dy);
    down = { x: e.screenX, y: e.screenY };
    window.velApi.move(dx, dy);
  });
  // A second tap within 400 ms toggles the zoom instead of blessing again.
  let lastTap = 0;
  document.addEventListener("pointerup", () => {
    if (down && moved < 4) {
      const now = performance.now();
      if (now - lastTap < 400) {
        lastTap = 0;
        window.velApi.zoom();
      } else {
        lastTap = now;
        if (!reduced) {
          spin = 1; spinStart = now / 1000;
          aura.classList.add("bless");
          setTimeout(() => aura.classList.remove("bless"), 500);
        }
      }
    }
    down = null;
  });
  document.addEventListener("contextmenu", (e) => { e.preventDefault(); window.velApi.menu(); });
  };

  start();
})();
