export default function Loading() {
  return (
    <div className="px-4 py-6 md:px-8 md:py-8 animate-pulse">
      <div className="h-8 w-40 bg-card border border-border rounded-md mb-2" />
      <div className="h-4 w-72 bg-card border border-border rounded-md mb-6" />

      <div className="rounded-lg border border-border bg-card h-16 mb-4" />

      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-card border border-border rounded-lg h-28" />
        ))}
      </div>
    </div>
  );
}
