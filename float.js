// Pose of a vel floating in air at time t (seconds): slow up-and-down bob and a breathing glow (no sideways sway).
(function (root) {
  function pose(t) {
    return {
      y: 7 * Math.sin(t * 1.1) + 2.5 * Math.sin(t * 2.3 + 1),
      glow: 0.35 + 0.15 * Math.sin(t * 1.4),
    };
  }

  const api = { pose };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.FloatLib = api;
})(typeof window !== "undefined" ? window : globalThis);
