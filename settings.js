(async () => {
  const box = document.getElementById("login");
  const note = document.getElementById("note");
  const zoom = document.getElementById("zoom");
  const zoomValue = document.getElementById("zoomValue");
  const size = document.getElementById("size");
  const sizeValue = document.getElementById("sizeValue");
  const { openAtLogin, packaged, zoomLevel, smallLevel } = await window.velApi.getSettings();

  // A slider that shows its percentage live and applies it when released.
  const bindSlider = (slider, label, level, apply) => {
    const show = () => {
      label.textContent = `${slider.value}%`;
    };
    slider.value = Math.round(level * 100);
    show();
    slider.addEventListener("input", show);
    slider.addEventListener("change", () => apply(slider.value / 100));
  };
  bindSlider(size, sizeValue, smallLevel, window.velApi.setSmallLevel);
  bindSlider(zoom, zoomValue, zoomLevel, window.velApi.setZoomLevel);

  box.checked = openAtLogin;
  if (!packaged) {
    note.textContent = "You're running from source (npm start). Login launch is only reliable in the packaged app.";
  }
  box.addEventListener("change", async () => {
    box.checked = await window.velApi.setOpenAtLogin(box.checked);
  });
})();
