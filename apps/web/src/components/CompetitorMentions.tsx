import { LLM_PROVIDERS, type CompetitorMention } from "@geotracker/shared";

interface Props {
  competitors: CompetitorMention[];
}

export default function CompetitorMentions({ competitors }: Props) {
  if (competitors.length === 0) return null;
  const total = LLM_PROVIDERS.length;
  return (
    <ul className="space-y-2">
      {competitors.map((c) => (
        <li
          key={c.name}
          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4"
        >
          <span className="font-medium text-slate-900">{c.name}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-mono text-slate-600">
            mentioned in {c.llmCount}/{total} LLMs
          </span>
        </li>
      ))}
    </ul>
  );
}
