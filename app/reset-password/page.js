import Link from "next/link";
import { getSession } from "@/lib/session";
import { SetPasswordForm } from "./SetPasswordForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Choose a new password",
  robots: { index: false },
};

// Reached from the emailed link: the link signs the person in, then they
// choose a password here.
export default async function ResetPasswordPage() {
  const user = await getSession();
  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: "440px" }}>
        <h1>Choose a new password</h1>
        {user?.provider === "supabase" ? (
          <>
            <p className="auth-subtitle">For {user.email}</p>
            <SetPasswordForm />
          </>
        ) : (
          <>
            <p className="auth-subtitle">
              This page opens from the link in your password email. The link may have expired, or been opened in a
              different browser.
            </p>
            <Link href="/signin/forgot" className="btn-primary btn-block">
              Send a new link
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
