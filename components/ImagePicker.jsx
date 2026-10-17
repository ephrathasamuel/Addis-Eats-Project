"use client";

import { useEffect, useRef, useState } from "react";

// Shrinks an image file in the browser and returns a JPEG data URL, so
// uploads stay small no matter how large the original photo is.
export async function resizeImageFile(file, maxSize = 1000, quality = 0.82) {
  if (!file || !file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("That image could not be read."));
      img.src = url;
    });
    const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    const context = canvas.getContext("2d");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Pick a photo by choosing a file, taking one with the camera, pasting from
 * the clipboard (Ctrl/Cmd+V while the picker is focused or anywhere when
 * `listenToWindowPaste` is set), or dragging it onto the box.
 */
export function ImagePicker({
  value,
  onChange,
  label = "Photo",
  maxSize = 1000,
  round = false,
  listenToWindowPaste = false,
  required = false,
}) {
  const inputRef = useRef(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  async function acceptFile(file) {
    setError("");
    setBusy(true);
    try {
      onChange(await resizeImageFile(file, maxSize));
    } catch (err) {
      setError(err.message || "Could not use that image.");
    } finally {
      setBusy(false);
    }
  }

  function handlePaste(event) {
    const item = [...(event.clipboardData?.items || [])].find((i) => i.type.startsWith("image/"));
    if (item) {
      event.preventDefault();
      acceptFile(item.getAsFile());
    }
  }

  // Lets the admin paste a screenshot anywhere in the dish form.
  useEffect(() => {
    if (!listenToWindowPaste) return undefined;
    const onPaste = (event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        if (![...(event.clipboardData?.items || [])].some((i) => i.type.startsWith("image/"))) return;
      }
      handlePaste(event);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listenToWindowPaste]);

  return (
    <div className="field">
      <label>
        {label}
        {required ? " *" : ""}
      </label>
      <div
        className={`image-picker ${dragging ? "is-dragging" : ""}`}
        tabIndex={0}
        onPaste={handlePaste}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file) acceptFile(file);
        }}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="Selected" className={`image-picker__preview ${round ? "image-picker__preview--round" : ""}`} />
        ) : (
          <div className={`image-picker__preview ${round ? "image-picker__preview--round" : ""}`} aria-hidden="true" />
        )}
        <div className="image-picker__body">
          <div className="image-picker__buttons">
            <button type="button" className="btn-secondary" onClick={() => inputRef.current?.click()} disabled={busy}>
              {busy ? "Processing…" : value ? "Change photo" : "Attach photo"}
            </button>
            {value && (
              <button type="button" className="btn-ghost" onClick={() => onChange("")}>
                Remove
              </button>
            )}
          </div>
          <span>Or paste an image (Ctrl+V / ⌘V) or drag one here.</span>
          {error && <span className="field-error">{error}</span>}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) acceptFile(file);
            event.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
