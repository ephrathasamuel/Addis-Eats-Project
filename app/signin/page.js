import { signIn, signUp } from "@/app/actions";
import Link from "next/link";
import PasswordInput from "@/components/PasswordInput";

export default async function SignInPage({ searchParams }) {
  const params = await searchParams;
  const next = params?.next || "/orders";
  const registering = params?.mode === "register";

  let fieldErrors = {};
  try {
    if (params?.error) fieldErrors = JSON.parse(params.error);
  } catch {
    fieldErrors = {};
  }
  const authError = params?.error && Object.keys(fieldErrors).length === 0
    ? params.error
    : null;

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: "440px" }}>
        <h1>{registering ? "Create account" : "Sign in"}</h1>
        <p className="auth-subtitle">
          {registering
            ? "Create a customer account to place and track orders."
            : "Sign in to your Addis Eats account"}
        </p>

        <form action={registering ? signUp : signIn}>
          <input type="hidden" name="next" value={next} />

          {registering && (
            <div className="field">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                name="name"
                defaultValue={params?.name || ""}
                placeholder="Enter your name"
                required
                autoComplete="name"
              />
              {fieldErrors.name && <p className="field-error">{fieldErrors.name}</p>}
            </div>
          )}

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={params?.email || ""}
              placeholder="Enter your email"
              required
              autoComplete="email"
            />
            {fieldErrors.email && <p className="field-error">{fieldErrors.email}</p>}
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <PasswordInput
              id="password"
              minLength={12}
              maxLength={256}
              placeholder={registering ? "At least 12 characters" : "Enter your password"}
              required
              autoComplete={registering ? "new-password" : "current-password"}
            />
            {fieldErrors.password && <p className="field-error">{fieldErrors.password}</p>}
          </div>

          {authError && <p className="field-error" role="alert">{authError}</p>}

          <button type="submit" className="btn-primary btn-block">
            {registering ? "Create customer account" : "Sign in"}
          </button>
        </form>

        <p className="auth-subtitle" style={{ marginTop: "1rem" }}>
          {registering ? "Already have an account?" : "New to Addis Eats?"}{" "}
          <Link href={registering ? `/signin?next=${encodeURIComponent(next)}` : `/signin?mode=register&next=${encodeURIComponent(next)}`}>
            {registering ? "Sign in" : "Create a customer account"}
          </Link>
        </p>
      </div>
    </div>
  );
}
