export default function Loading() {
  return (
    <div className="min-h-screen bg-[#141414]">
      {/* Navbar skeleton */}
      <div className="h-16 bg-black/50" />

      {/* Hero skeleton */}
      <div className="w-full h-[60vh] bg-[#1f1f1f] animate-pulse" />

      {/* Carousel skeletons */}
      <div className="-mt-16 relative z-10 space-y-8 px-4 md:px-8">
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <div className="h-6 w-40 bg-[#1f1f1f] rounded animate-pulse mb-3" />
            <div className="flex gap-3">
              {[1, 2, 3, 4, 5, 6].map((j) => (
                <div
                  key={j}
                  className="flex-shrink-0 w-[150px] md:w-[180px] aspect-[2/3] bg-[#1f1f1f] rounded-md animate-pulse"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
