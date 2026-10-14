import Link from "next/link";

export default function NotFound() {
  return (
    <div>
      <h1>Not found</h1>
      <p>We couldn&apos;t find that dish or page.</p>
      <Link href="/menu">Back to the menu</Link>
    </div>
  );
}
