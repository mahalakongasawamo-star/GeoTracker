import { motion } from "framer-motion";

// 3x2 bento grid (asymmetric on md+). Each tile is a glass card revealed on
// scroll via viewport-triggered framer-motion.

const card = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

interface Tile {
  title: string;
  body: string;
  /** Tailwind grid placement classes. */
  area: string;
  /** Optional decorative ornament. */
  ornament?: React.ReactNode;
}

const TILES: Tile[] = [
  {
    title: "Why AI visibility, now",
    body:
      "Google AI Overviews sit above organic results. ChatGPT, Claude, Perplexity, and Gemini already shape what people try first. If they don't recommend you, you're invisible — and you'd never know.",
    area: "md:col-span-2 md:row-span-1",
    ornament: <Sparkline />,
  },
  {
    title: "Real engines, not scrapes",
    body:
      "We hit each provider's API live for every audit. No keyword guessing, no stale snapshots, no SEO theatrics.",
    area: "md:col-span-1 md:row-span-1",
  },
  {
    title: "What we ask",
    body:
      "Per-industry prompt sets tuned to the questions your customers actually ask — \"best dentist near me\", \"what's the cheapest plumber in Austin\", \"who do you recommend for…\"",
    area: "md:col-span-1 md:row-span-1",
  },
  {
    title: "What you get back",
    body:
      "A 0–100 visibility score, a per-engine breakdown, the competitors who got mentioned instead, and the contact info gaps you can close this week.",
    area: "md:col-span-2 md:row-span-1",
    ornament: <Bars />,
  },
];

export default function BentoFeatures() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
            What's inside an audit
          </p>
          <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">
            Built for the way customers actually search now
          </h2>
        </div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          transition={{ staggerChildren: 0.08 }}
          className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3"
        >
          {TILES.map((tile) => (
            <motion.article
              key={tile.title}
              variants={card}
              className={`relative overflow-hidden rounded-3xl border border-white/60 bg-white/55 p-6 shadow-glass backdrop-blur-2xl ${tile.area}`}
            >
              <h3 className="text-lg font-semibold text-slate-900">{tile.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">{tile.body}</p>
              {tile.ornament ? (
                <div className="pointer-events-none absolute -bottom-4 -right-4 opacity-90">
                  {tile.ornament}
                </div>
              ) : null}
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function Sparkline() {
  return (
    <svg width="180" height="80" viewBox="0 0 180 80" fill="none" className="text-brand-500/70">
      <defs>
        <linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0 60 L20 52 L40 56 L60 38 L80 44 L100 24 L120 30 L140 12 L160 20 L180 6"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M0 60 L20 52 L40 56 L60 38 L80 44 L100 24 L120 30 L140 12 L160 20 L180 6 L180 80 L0 80 Z"
        fill="url(#sparkFill)"
      />
    </svg>
  );
}

function Bars() {
  const heights = [18, 32, 24, 44, 36, 56, 48];
  return (
    <svg width="200" height="80" viewBox="0 0 200 80" fill="none">
      {heights.map((h, i) => (
        <rect
          key={i}
          x={i * 28 + 4}
          y={80 - h}
          width="18"
          height={h}
          rx="4"
          fill="url(#barGrad)"
        />
      ))}
      <defs>
        <linearGradient id="barGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#0b8de8" />
          <stop offset="100%" stopColor="#0a548f" stopOpacity="0.4" />
        </linearGradient>
      </defs>
    </svg>
  );
}
