const assert = require("node:assert");
const { spawnDroplet, stepDroplet } = require("./water.js");

// A splash droplet rises first, then falls back below where it started, then fades out.
const drop = spawnDroplet(() => 0.5, 0, 0);
const startY = drop.y;
let peak = startY;
let steps = 0;
while (stepDroplet(drop, 1 / 60)) {
  peak = Math.min(peak, drop.y);
  steps++;
  assert.ok(steps < 120, "droplet should fade within 2 s");
}
assert.ok(peak < startY, "droplet rises after the splash");
assert.ok(drop.y > startY, "droplet falls back below the impact point");
assert.ok(drop.life <= 0, "droplet has faded");
console.log("water ok");
