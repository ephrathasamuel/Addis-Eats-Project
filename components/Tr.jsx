"use client";

import { useT } from "@/components/Providers";

// One translated phrase, usable inside server components: <Tr text="Sold out" />.
export function Tr({ text, values }) {
  const tr = useT();
  return tr(text, values);
}
