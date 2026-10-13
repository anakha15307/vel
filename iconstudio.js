(() => {
  const drop = document.getElementById("drop");
  const fileInput = document.getElementById("file");
  const preview = document.getElementById("preview");
  const previewRow = document.getElementById("previewRow");
  const exportBtn = document.getElementById("exportBtn");
  const applyBtn = document.getElementById("applyBtn");
  const status = document.getElementById("status");

  const PREVIEW_SIZES = [128, 48, 32, 16];
  let sourceImage = null; // HTMLImageElement, set once a picture is loaded

  // Pick the right format for the user's computer, so they don't have to think.
  const onWindows = navigator.platform.toLowerCase().startsWith("win");
  document.querySelector(`input[name="format"][value="${onWindows ? "ico" : "icns"}"]`).checked = true;

  const setStatus = (text, ok) => {
    status.textContent = text;
    status.className = ok ? "ok" : "";
  };

  // Draw the source picture fitted and centred on a transparent square canvas.
  function renderAt(size) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    const iw = sourceImage.naturalWidth;
    const ih = sourceImage.naturalHeight;
    const k = Math.min(size / iw, size / ih);
    const w = Math.round(iw * k);
    const h = Math.round(ih * k);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(sourceImage, Math.round((size - w) / 2), Math.round((size - h) / 2), w, h);
    return canvas.toDataURL("image/png");
  }

  function showPreview() {
    previewRow.innerHTML = "";
    for (const s of PREVIEW_SIZES) {
      const wrap = document.createElement("div");
      wrap.className = "psize";
      const canvas = document.createElement("canvas");
      canvas.width = s;
      canvas.height = s;
      const img = new Image();
      img.onload = () => canvas.getContext("2d").drawImage(img, 0, 0, s, s);
      img.src = renderAt(s);
      const label = document.createElement("div");
      label.textContent = `${s}px`;
      wrap.appendChild(canvas);
      wrap.appendChild(label);
      previewRow.appendChild(wrap);
    }
    preview.style.display = "block";
  }

  function loadFile(file) {
    if (!file || !file.type.startsWith("image/")) {
      setStatus("That is not a picture file. Try a PNG or JPG.", false);
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      sourceImage = img;
      exportBtn.disabled = false;
      applyBtn.disabled = false;
      setStatus(`Loaded “${file.name}”. Pick a format and save.`, true);
      showPreview();
    };
    img.onerror = () => setStatus("Could not read that picture.", false);
    img.src = url;
  }

  drop.addEventListener("click", () => fileInput.click());
  drop.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") fileInput.click();
  });
  fileInput.addEventListener("change", () => loadFile(fileInput.files[0]));
  ["dragenter", "dragover"].forEach((ev) =>
    drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); })
  );
  ["dragleave", "drop"].forEach((ev) =>
    drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("over"); })
  );
  drop.addEventListener("drop", (e) => loadFile(e.dataTransfer.files[0]));

  const EXPORT_SIZES = {
    icns: [16, 32, 64, 128, 256, 512, 1024],
    ico: [16, 24, 32, 48, 64, 128, 256],
  };

  exportBtn.addEventListener("click", async () => {
    if (!sourceImage) return;
    const format = document.querySelector('input[name="format"]:checked').value;
    exportBtn.disabled = true;
    setStatus("Making your icon…", false);
    try {
      const images = EXPORT_SIZES[format].map((size) => ({ size, dataUrl: renderAt(size) }));
      const result = await window.velApi.exportIcon({ format, images });
      if (result && result.saved) {
        setStatus(`Saved: ${result.path}`, true);
      } else {
        setStatus("Cancelled. Your picture is still loaded.", false);
      }
    } catch (err) {
      setStatus("Something went wrong making the icon.", false);
    }
    exportBtn.disabled = false;
  });

  applyBtn.addEventListener("click", async () => {
    if (!sourceImage) return;
    const format = document.querySelector('input[name="format"]:checked').value;
    applyBtn.disabled = true;
    exportBtn.disabled = true;
    setStatus("Choose a folder…", false);
    try {
      const images = EXPORT_SIZES[format].map((size) => ({ size, dataUrl: renderAt(size) }));
      const result = await window.velApi.applyIcon({ images });
      if (result && result.applied) {
        setStatus("Done! Your folder has a new icon.", true);
      } else if (result && result.error) {
        setStatus("Could not set the icon. Try the save button instead.", false);
      } else {
        setStatus("Cancelled. Your picture is still loaded.", false);
      }
    } catch (err) {
      setStatus("Could not set the icon. Try the save button instead.", false);
    }
    applyBtn.disabled = false;
    exportBtn.disabled = false;
  });
})();
