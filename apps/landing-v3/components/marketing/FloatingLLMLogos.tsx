import { FloatingElement } from "@/components/ui/Floating";

// Five floating LLM marks. Positions, sizes, depths, and colors mirror the
// mockup's .llm-float-1 ... .llm-float-5 rules exactly. Approximated brand
// marks (per §9 known constraints) — to be swapped for official assets in
// Phase 1.5. Hidden below 900px (CSS) — there's no cursor to drive parallax
// on mobile and the cluster reads as noise on a narrow screen.

interface Mark {
  depth: number;
  className: string;
  ambient: string;
  svg: React.ReactNode;
}

const MARKS: Mark[] = [
  // ChatGPT — top, above the card
  {
    depth: 2.2,
    className: "top-[8%] left-[64%] h-[52px] w-[52px] text-[#10a37f] opacity-55",
    ambient: "animate-idle-bob-1",
    svg: (
      <path
        d="M28.7 13.1a7.7 7.7 0 0 0-.66-6.32 7.78 7.78 0 0 0-8.38-3.73A7.77 7.77 0 0 0 13.6 0c-3.4 0-6.42 2.18-7.48 5.41A7.77 7.77 0 0 0 1.04 9.13a7.77 7.77 0 0 0 .96 9.13 7.7 7.7 0 0 0 .66 6.32 7.78 7.78 0 0 0 8.38 3.73 7.77 7.77 0 0 0 5.86 2.62c3.4 0 6.43-2.19 7.49-5.42a7.77 7.77 0 0 0 5.07-3.72 7.77 7.77 0 0 0-.76-8.69ZM16.9 29.85a5.77 5.77 0 0 1-3.7-1.34l.18-.1 6.13-3.54a1 1 0 0 0 .5-.87v-8.64l2.6 1.5v7.18c0 3.2-2.59 5.79-5.7 5.81ZM4.5 24.55a5.77 5.77 0 0 1-.69-3.86l.18.1 6.14 3.55a1 1 0 0 0 1 0l7.5-4.33v3l-6.2 3.58a5.8 5.8 0 0 1-7.93-2.04Zm-1.6-13.4a5.77 5.77 0 0 1 3.02-2.55v7.31a1 1 0 0 0 .5.87l7.49 4.33-2.6 1.5-6.13-3.55a5.79 5.79 0 0 1-2.28-7.91ZM23.5 14.7l-7.5-4.33L18.6 8.86l6.14 3.55a5.78 5.78 0 0 1-.87 10.4v-7.31a1 1 0 0 0-.36-.8Zm2.6-3.9-.18-.1-6.13-3.55a1 1 0 0 0-1 0l-7.5 4.33V8.5l6.2-3.58a5.8 5.8 0 0 1 7.94 2.04 5.78 5.78 0 0 1 .67 3.84Zm-16.24 5.36-2.6-1.5V7.5a5.78 5.78 0 0 1 9.5-4.45l-.18.1-6.13 3.55a1 1 0 0 0-.5.87l-.01 8.59Zm1.4-3.04 3.34-1.93 3.34 1.93v3.85l-3.34 1.93-3.34-1.93v-3.85Z"
        fill="currentColor"
      />
    ),
  },
  // Claude — diagonal band between pitch and card
  {
    depth: 2.8,
    className: "top-[38%] left-[50%] h-[44px] w-[44px] text-[#cc7b5c] opacity-45",
    ambient: "animate-idle-bob-2",
    svg: (
      <path
        d="M16 0L18.2 8.9L25 3L21.1 11.8L30 9.6L23 16L30 22.4L21.1 20.2L25 29L18.2 23.1L16 32L13.8 23.1L7 29L10.9 20.2L2 22.4L9 16L2 9.6L10.9 11.8L7 3L13.8 8.9L16 0Z"
        fill="currentColor"
      />
    ),
  },
  // Gemini — top-right edge
  {
    depth: 3,
    className: "top-[12%] left-[84%] h-[46px] w-[46px] text-[#4285f4] opacity-50",
    ambient: "animate-idle-bob-3",
    svg: (
      <path
        d="M16 0C16 8.84 8.84 16 0 16C8.84 16 16 23.16 16 32C16 23.16 23.16 16 32 16C23.16 16 16 8.84 16 0Z"
        fill="currentColor"
      />
    ),
  },
  // Perplexity — bottom-right
  {
    depth: 1.8,
    className: "top-[85%] left-[76%] h-[38px] w-[38px] text-[#1f7a8c] opacity-45",
    ambient: "animate-idle-bob-1-rev",
    svg: (
      <>
        <path d="M16 2L28 9V23L16 30L4 23V9L16 2Z" stroke="currentColor" strokeWidth="2.5" fill="none" />
        <circle cx="16" cy="16" r="3.5" fill="currentColor" />
        <path
          d="M16 2V11M16 21V30M4 9L11.5 13M20.5 19L28 23M28 9L20.5 13M11.5 19L4 23"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </>
    ),
  },
  // Grok — diagonal mid, below the headline
  {
    depth: 1.4,
    className: "top-[65%] left-[45%] h-[34px] w-[34px] text-[#1a1a1a] opacity-30",
    ambient: "animate-idle-bob-2-slow",
    svg: (
      <path
        d="M5 5L27 27M27 5L5 27"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="square"
      />
    ),
  },
];

export default function FloatingLLMLogos() {
  return (
    <>
      {MARKS.map((mark, i) => (
        <FloatingElement key={i} depth={mark.depth}>
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute z-10 max-[900px]:hidden ${mark.className}`}
          >
            <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" fill="none" className={`block h-full w-full ${mark.ambient}`}>
              {mark.svg}
            </svg>
          </div>
        </FloatingElement>
      ))}
    </>
  );
}
