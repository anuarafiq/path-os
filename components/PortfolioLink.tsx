import Link from "next/link";
import type { ReactNode } from "react";

type Props = { candidateId: string; className?: string; children?: ReactNode };

export default function PortfolioLink({ candidateId, className, children }: Props) {
  return (
    <Link
      href={`/p/${candidateId}`}
      target="_blank"
      rel="noopener noreferrer"
      prefetch={false}
      className={className}
    >
      {children ?? "View portfolio ↗"}
    </Link>
  );
}
