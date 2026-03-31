export default function MovieLoading() {
  return (
    <div className="min-h-screen bg-[#141414]">
      <div className="h-16 bg-black/50" />
      <div className="w-full h-[60vh] bg-[#1f1f1f] animate-pulse" />
      <div className="-mt-32 relative z-10 px-4 md:px-8 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="hidden md:block w-64 aspect-[2/3] bg-[#1f1f1f] rounded-lg animate-pulse" />
          <div className="flex-1 space-y-4">
            <div className="h-10 w-72 bg-[#1f1f1f] rounded animate-pulse" />
            <div className="h-4 w-48 bg-[#1f1f1f] rounded animate-pulse" />
            <div className="h-20 w-full bg-[#1f1f1f] rounded animate-pulse" />
            <div className="h-12 w-48 bg-[#1f1f1f] rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
