import { cn } from "@/lib/utils";

// 30×30 coral square rotated 45° with an inner cream cutout. The rotate is
// kept as `preserveTransform` upstream when wrapped by <FloatingElement> on
// the landing — that way the parallax translate doesn't wipe the rotation.

export default function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-block flex-shrink-0",
        "h-[30px] w-[30px] rounded-[5px] bg-coral",
        "shadow-[0_4px_12px_rgba(255,91,62,0.35)]",
        "after:absolute after:inset-[6px] after:rounded-[3px] after:bg-bg after:content-['']",
        className,
      )}
    />
  );
}
