"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function LoadMoreButton({ href }: { href: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(() => {
      // scroll: false keeps the user's position so new items appear below
      // without jumping back to the top.
      router.push(href, { scroll: false });
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="px-6 py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:bg-red-900 disabled:cursor-wait text-white rounded-md text-sm font-medium transition-colors inline-flex items-center gap-2"
    >
      {pending && (
        <svg
          className="w-4 h-4 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="40 60"
          />
        </svg>
      )}
      {pending ? "Carregando…" : "Carregar mais"}
    </button>
  );
}
