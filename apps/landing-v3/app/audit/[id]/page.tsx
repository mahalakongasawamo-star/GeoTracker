import type { Metadata } from "next";
import Link from "next/link";
import BrandMark from "@/components/ui/BrandMark";
import AuditRunner from "@/components/audit/AuditRunner";

// Dynamic route: /audit/[id]. Renders the brand-voiced running view that
// upgrades to a tear-sheet result once the SSE stream emits "complete".
// Force dynamic so the page isn't statically generated at build time
// (each id is unique and the page is purely client-driven anyway).

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Audit — GeoTracker",
  description: "Live AI visibility audit running across five engines.",
};

interface Props {
  params: { id: string };
}

export default function AuditPage({ params }: Props) {
  return (
    <main className="min-h-screen bg-bg px-6 py-10 max-[720px]:py-8">
      <div className="mx-auto max-w-[880px]">
        <div className="mb-10 flex items-center gap-3 text-[16px] font-bold tracking-[-0.01em] text-ink">
          <Link href="/" className="inline-flex items-center gap-3 no-underline text-ink hover:opacity-80">
            <BrandMark />
            <span>GeoTracker</span>
          </Link>
        </div>

        <AuditRunner auditId={params.id} />
      </div>
    </main>
  );
}
