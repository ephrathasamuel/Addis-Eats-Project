import Link from "next/link";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata = {
  title: "Reset your password",
  robots: { index: false },
};

export default async function ForgotPasswordPage({ searchParams }) {
  const params = await searchParams;
  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: "440px" }}>
        <h1>Forgot your password?</h1>
        <p className="auth-subtitle">Enter your email and we&apos;ll send you a link to choose a new one.</p>
        {typeof params?.error === "string" && (
          <div className="auth-notice" role="alert">
            <p>{params.error}</p>
          </div>
        )}
        <ForgotPasswordForm initialEmail={typeof params?.email === "string" ? params.email : ""} />
        <p className="auth-subtitle" style={{ marginTop: "1.1rem" }}>
          Remembered it? <Link href="/signin">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
