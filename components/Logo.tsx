import Image from "next/image";

export function Logo({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <Image src="/logo.png" width={size} height={size} alt="Path OS" className={className} />
  );
}
