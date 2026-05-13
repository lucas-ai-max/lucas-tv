"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface PlayerEmbedProps {
  src: string;
  title: string;
  backHref: string;
  progressId?: string | null;
}

export default function PlayerEmbed({
  src,
  title,
  backHref,
  progressId,
}: PlayerEmbedProps) {
  const router = useRouter();
  const [showExitPrompt, setShowExitPrompt] = useState(false);
  const [leaving, setLeaving] = useState<"save" | "discard" | null>(null);
  const allowNavigationRef = useRef(false);

  useEffect(() => {
    if (!progressId) return;

    window.history.pushState({ lucasTvWatchPrompt: true }, "", window.location.href);

    function handlePopState() {
      if (allowNavigationRef.current) return;
      window.history.pushState({ lucasTvWatchPrompt: true }, "", window.location.href);
      setShowExitPrompt(true);
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (allowNavigationRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [progressId]);

  function requestExit() {
    if (!progressId) {
      router.push(backHref);
      return;
    }
    setShowExitPrompt(true);
  }

  async function leave(saveForLater: boolean) {
    setLeaving(saveForLater ? "save" : "discard");

    if (!saveForLater && progressId) {
      await fetch("/api/watch-progress", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progressId }),
      }).catch(() => null);
    }

    allowNavigationRef.current = true;
    router.push(backHref);
  }

  return (
    <div className="fixed inset-0 bg-black z-50">
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent p-4 flex items-center gap-4 opacity-0 hover:opacity-100 transition-opacity duration-300">
        <button
          type="button"
          onClick={requestExit}
          className="flex items-center gap-2 text-white hover:text-gray-300 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar
        </button>
        <span className="text-white font-medium truncate">{title}</span>
      </div>

      <iframe
        src={src}
        className="w-full h-full border-0"
        allow="autoplay *; encrypted-media *; picture-in-picture *; fullscreen *; clipboard-write *; accelerometer *; gyroscope *; web-share *"
      />

      <div className="absolute top-1 left-1 md:top-2 md:left-2 w-24 h-10 md:w-32 md:h-12 rounded-md bg-black/40 backdrop-blur-xl z-10 pointer-events-auto" />

      {showExitPrompt && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-lg bg-[#181818] border border-white/10 p-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-white mb-2">
              Continuar assistindo depois?
            </h2>
            <p className="text-sm text-gray-300 mb-6">
              Posso deixar este titulo na sua lista para voce voltar mais tarde.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => leave(true)}
                disabled={leaving !== null}
                className="flex-1 px-4 py-3 rounded bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors disabled:opacity-60"
              >
                {leaving === "save" ? "Salvando..." : "Sim, salvar"}
              </button>
              <button
                type="button"
                onClick={() => leave(false)}
                disabled={leaving !== null}
                className="flex-1 px-4 py-3 rounded bg-white/10 hover:bg-white/15 text-white font-semibold transition-colors disabled:opacity-60"
              >
                {leaving === "discard" ? "Removendo..." : "Nao salvar"}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowExitPrompt(false)}
              disabled={leaving !== null}
              className="mt-4 w-full px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors disabled:opacity-60"
            >
              Continuar assistindo agora
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
