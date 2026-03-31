import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#141414]">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-red-600 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-white mb-2">
          Página não encontrada
        </h2>
        <p className="text-gray-400 mb-8">
          O conteúdo que você procura não existe ou foi removido.
        </p>
        <Link
          href="/"
          className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded transition-colors"
        >
          Voltar ao Início
        </Link>
      </div>
    </div>
  );
}
