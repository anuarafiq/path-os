import Image from "next/image";

export function Logo({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="Path OS"
      width={size}
      height={size}
      className={`object-contain ${className}`}
    />
  );
}
