"use client";

import { useEffect } from "react";

// Minimal accessible modal: closes on Escape and backdrop click.
export function Modal({ title, onClose, children, width = 460 }) {
  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ maxWidth: width }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal__header">
          <h2 className="modal__title">{title}</h2>
          <button type="button" className="btn-ghost modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Avatar({ name, photo, size = 40 }) {
  const initials = String(name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo} alt="" className="avatar" style={{ width: size, height: size }} />;
  }
  return (
    <span className="avatar avatar--initials" style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden="true">
      {initials}
    </span>
  );
}

export function Toast({ message, tone = "success", onDone }) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => onDone?.(), 4500);
    return () => clearTimeout(timer);
  }, [message, onDone]);
  if (!message) return null;
  return (
    <div className={`toast toast--${tone}`} role="status">
      {message}
    </div>
  );
}
