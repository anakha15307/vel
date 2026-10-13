// Water poured over a shivalinga: a falling stream, rivulets down the dome, and splash droplets.
// Coordinates are local to the vel group (origin at the picture's centre, y down).
(function (root) {
  const GRAVITY = 0.09; // per 1/60 s frame
  const DROPLET_LIFE = 0.8; // seconds
  const SPLASHES_PER_SECOND = 45;
  const POOL_SIZE = 20;

  function spawnDroplet(random, x, y) {
    return { x, y, vx: (random() - 0.5) * 1.8, vy: -(0.6 + random() * 1.2), life: 1 };
  }

  // Advance one droplet by dt seconds. Returns false once it has faded out.
  function stepDroplet(p, dt) {
    const k = dt * 60;
    p.vy += GRAVITY * k;
    p.x += p.vx * k;
    p.y += p.vy * k;
    p.life -= dt / DROPLET_LIFE;
    return p.life > 0;
  }

  // w: { x, top, left, right, base, sourceY } - stream x, dome apex y, body edges, body base y, y where the stream starts.
  function createWater(parent, w, animate) {
    const NS = "http://www.w3.org/2000/svg";
    const make = (name, attrs) => {
      const node = document.createElementNS(NS, name);
      for (const key in attrs) node.setAttribute(key, attrs[key]);
      parent.appendChild(node);
      return node;
    };
    const line = (d, width, opacity, extra) =>
      make("path", { d, fill: "none", stroke: "#cfeaff", "stroke-width": width, "stroke-linecap": "round", opacity, ...extra });

    const streamPath = `M ${w.x} ${w.sourceY} L ${w.x} ${w.top}`;
    const stream = line(streamPath, 5, 0.5);
    const sparkle = line(streamPath, 2, 0.85, { stroke: "#ffffff", "stroke-dasharray": "6 10" });
    const sidePath = (edge) =>
      `M ${w.x} ${w.top} C ${(w.x + edge) / 2} ${w.top - 2} ${edge} ${w.top + 20} ${edge} ${w.top + 60} L ${edge} ${w.base}`;
    const rivulets = [sidePath(w.left), sidePath(w.right)].map((d) =>
      line(d, 2.4, 0.55, { "stroke-dasharray": "5 9" }));
    const drops = Array.from({ length: POOL_SIZE }, () =>
      make("circle", { r: 1.3, fill: "#e6f4ff", opacity: 0 }));
    const live = [];
    let carry = 0;

    return {
      update(t, dt) {
        if (!animate) return;
        stream.setAttribute("stroke-width", (4.6 + 0.7 * Math.sin(t * 9)).toFixed(2));
        sparkle.setAttribute("stroke-dashoffset", (-(t * 70) % 16).toFixed(2));
        for (const r of rivulets) r.setAttribute("stroke-dashoffset", (-(t * 38) % 14).toFixed(2));

        carry += dt * SPLASHES_PER_SECOND;
        while (carry >= 1 && live.length < POOL_SIZE) {
          carry -= 1;
          live.push(spawnDroplet(Math.random, w.x, w.top));
        }
        carry = Math.min(carry, 1);
        for (let i = live.length - 1; i >= 0; i--) if (!stepDroplet(live[i], dt)) live.splice(i, 1);
        drops.forEach((node, i) => {
          const p = live[i];
          if (!p) return node.setAttribute("opacity", 0);
          node.setAttribute("cx", p.x.toFixed(2));
          node.setAttribute("cy", p.y.toFixed(2));
          node.setAttribute("opacity", (0.9 * p.life).toFixed(2));
        });
      },
    };
  }

  const api = { createWater, spawnDroplet, stepDroplet };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.WaterLib = api;
})(typeof window !== "undefined" ? window : globalThis);
