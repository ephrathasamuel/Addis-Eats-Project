"use client";

import { useState } from "react";
import { signIn } from "@/app/actions";

export default function SignInForm({ next = "/orders", initialName = "Almaz", initialEmail = "almaz@example.com", fieldErrors = {} }) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("password123");
  const [pending, setPending] = useState(false);

  function handleSubmit(e) {
    if (pending) {
      e.preventDefault();
      return;
    }
    setPending(true);
  }

  return (
    <form action={signIn} onSubmit={handleSubmit} className="auth-form">
      <input type="hidden" name="next" value={next} />

      <div className="field">
        <label htmlFor="name">Name</label>
        <input
          id="name"
          name="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoComplete="name"
        />
        {fieldErrors.name && <p className="field-error">{fieldErrors.name}</p>}
      </div>

      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        {fieldErrors.email && <p className="field-error">{fieldErrors.email}</p>}
      </div>

      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
        {fieldErrors.password && <p className="field-error">{fieldErrors.password}</p>}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="btn-primary btn-block"
        style={{ minHeight: "44px" }}
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
