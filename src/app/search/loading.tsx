export default function SearchLoading() {
  return (
    <div className="min-h-screen bg-[#141414]">
      <div className="h-16 bg-black/50" />
      <div className="pt-24 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="h-8 w-64 bg-[#1f1f1f] rounded animate-pulse mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-[#1f1f1f] rounded-md animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
