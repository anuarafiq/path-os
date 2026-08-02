export default function Loading() {
  return (
    <div className="px-4 py-6 md:px-8 md:py-8 animate-pulse">
      <div className="h-9 w-56 bg-card border border-border rounded-md mb-2" />
      <div className="h-4 w-40 bg-card border border-border rounded-md mb-8" />

      <div className="bg-card border border-border rounded-xl h-24 mb-8" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-card border border-border rounded-lg h-24" />
        ))}
      </div>

      <div className="border border-border rounded-xl h-48" />
    </div>
  );
}
