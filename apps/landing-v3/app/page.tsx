import DotGrid from "@/components/ui/DotGrid";
import CursorSpotlight from "@/components/ui/CursorSpotlight";
import HeroLanding from "@/components/marketing/HeroLanding";

// `/` route — single-screen, no-scroll on desktop (locked via globals.css),
// natural scroll on mobile. Server-rendered shell with client islands for
// every effect (Floating, AuditForm, LiveExampleCard tilt, CursorSpotlight).

export default function HomePage() {
  return (
    <>
      <DotGrid />
      <CursorSpotlight />
      <HeroLanding />
    </>
  );
}
