"use client";

import { useState } from "react";

export default function PasswordInput({
  id,
  name = "password",
  placeholder,
  autoComplete,
  required = true,
  minLength,
  maxLength,
  defaultValue,
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-input">
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        minLength={minLength}
        maxLength={maxLength}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
      />
      <button
        type="button"
        className="password-input__toggle"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? (
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path
              d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.2A10.8 10.8 0 0112 5c5.5 0 9 7 9 7a16 16 0 01-3.1 3.8M6.2 6.2C3.9 7.7 3 12 3 12s3.5 7 9 7a10.5 10.5 0 004.1-.8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path
              d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        )}
      </button>
    </div>
  );
}
