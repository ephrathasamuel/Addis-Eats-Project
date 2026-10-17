"use client";

import { useFormStatus } from "react-dom";

// Submit button that disables itself while its form's server action runs.
export default function SubmitButton({ children, pendingText = "Working…", className = "btn-primary", style }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} style={style} disabled={pending} aria-busy={pending}>
      {pending ? pendingText : children}
    </button>
  );
}
