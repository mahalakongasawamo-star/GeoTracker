import DotGrid from "@/components/ui/DotGrid";
import CursorSpotlight from "@/components/ui/CursorSpotlight";
import LandingMode from "@/components/ui/LandingMode";
import HeroLanding from "@/components/marketing/HeroLanding";

// `/` route — single-screen, no-scroll on desktop (locked via the
// `landing-mode` class on <html>; LandingMode mounts that class so the
// lock doesn't bleed into /audit/[id] or /methodology). Natural scroll
// on mobile. Server-rendered shell with client islands for every effect
// (Floating, AuditForm, LiveExampleCard, CursorSpotlight, LandingMode).

export default function HomePage() {
  return (
    <>
      <LandingMode />
      <DotGrid />
      <CursorSpotlight />
      <HeroLanding />
    </>
  );
}
