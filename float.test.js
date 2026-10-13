const assert = require("node:assert");
const { pose } = require("./float.js");

for (let t = 0; t < 600; t += 0.05) {
  const p = pose(t);
  assert.ok(Math.abs(p.y) <= 9.5, `y out of range at ${t}: ${p.y}`);
  assert.strictEqual(p.rotation, undefined, "no sideways sway");
  assert.ok(p.glow >= 0.2 && p.glow <= 0.5, `glow out of range at ${t}: ${p.glow}`);
}
console.log("float ok");
