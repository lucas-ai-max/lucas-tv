"use client";

import Link from "next/link";

export default function Error({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#141414]">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-red-600 mb-4">Erro</h1>
        <p className="text-gray-400 mb-8">
          Algo deu errado ao carregar esta página.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded transition-colors"
          >
            Tentar novamente
          </button>
          <Link
            href="/"
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded transition-colors"
          >
            Voltar ao Início
          </Link>
        </div>
      </div>
    </div>
  );
}
