export default function Loading() {
  return (
    <div className="px-4 py-6 md:px-8 md:py-8 animate-pulse">
      <div className="h-8 w-32 bg-card border border-border rounded-md mb-2" />
      <div className="h-4 w-56 bg-card border border-border rounded-md mb-8" />

      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-card border border-border rounded-lg h-20" />
        ))}
      </div>
    </div>
  );
}
