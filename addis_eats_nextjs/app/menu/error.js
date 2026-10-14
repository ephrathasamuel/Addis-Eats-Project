"use client";

export default function MenuError({ error, reset }) {
  return (
    <div role="alert">
      <h2>Something went wrong loading the menu.</h2>
      <p>{error?.message || "Please try again."}</p>
      <button className="add-to-cart" onClick={() => reset()}>
        Try again
      </button>
    </div>
  );
}
