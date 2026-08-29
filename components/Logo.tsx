import Image from "next/image";

export function Logo({ size = 40, className = "", priority = false }: { size?: number; className?: string; priority?: boolean }) {
  return (
    <Image
      src="/logo.png"
      width={size}
      height={size}
      alt="Path OS"
      className={className}
      priority={priority}
      style={{ width: "auto", height: "auto" }}
    />
  );
}
