// The vels you can choose from. `view` is the zoomed window size (also the SVG viewBox);
// `image` is how big the picture is drawn inside it. The small size is SMALL_SCALE of `view`.
(function (root) {
  const SMALL_SCALE = 0.3;

  const VELS = {
    brass: { label: "Brass Vel", file: "vel.webp", view: [240, 440], image: [170.4, 400] },
    // The picture already has its own glow, so the extra halo is turned off.
    teardrop: { label: "Teardrop Vel", file: "vel-teardrop.png", view: [290, 440], image: [266.7, 400], glow: false },
    lemon: { label: "Vel with Lemon", file: "vel-lemon.png", view: [290, 440], image: [266.7, 400], glow: false },
    om: { label: "Om & Vel", file: "om-vel.png", view: [360, 360], image: [320, 320] },
    // Picture sits low in the window so the water stream has room to fall from above the dome.
    // `water` is in picture-local coordinates (origin at the picture's centre).
    shivalinga: {
      label: "Shivalinga",
      file: "shivalinga.png",
      view: [320, 400],
      image: [300, 300],
      imageCenter: [160, 250],
      glow: false,
      water: { x: -18.4, top: -122, left: -60, right: 23, base: -14 },
    },
    hanuman: { label: "Hanuman Swamy", file: "hanuman.png", view: [380, 334], image: [360, 316.1] },
  };

  const api = { VELS, SMALL_SCALE };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.VelsLib = api;
})(typeof window !== "undefined" ? window : globalThis);
