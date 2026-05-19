interface Props {
  score: number;
  label?: string;
}

export default function ScoreGauge({ score, label = "AI Visibility" }: Props) {
  const clamped = Math.max(0, Math.min(100, score));
  const r = 80;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;
  const color = clamped >= 75 ? "#16a34a" : clamped >= 40 ? "#eab308" : "#dc2626";
  return (
    <div className="flex flex-col items-center">
      <svg width="200" height="200" viewBox="0 0 200 200" aria-label={`${label} score: ${clamped}`}>
        <circle cx="100" cy="100" r={r} stroke="#e5e7eb" strokeWidth="14" fill="none" />
        <circle
          cx="100"
          cy="100"
          r={r}
          stroke={color}
          strokeWidth="14"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 100 100)"
          style={{ transition: "stroke-dashoffset 600ms ease, stroke 600ms ease" }}
        />
        <text x="100" y="105" textAnchor="middle" fontSize="44" fontWeight="700" fill="#0f172a">
          {clamped}
        </text>
        <text x="100" y="135" textAnchor="middle" fontSize="13" fill="#64748b">
          / 100
        </text>
      </svg>
      <p className="mt-2 text-sm text-slate-500">{label}</p>
    </div>
  );
}
