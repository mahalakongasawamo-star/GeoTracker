import { getPromptSet, type PromptTemplate } from "@geotracker/shared";

export interface ResolvedPrompt {
  text: string;
  city: string;
  national: boolean;
}

export function resolvePrompts(industrySlug: string, cities: string[]): ResolvedPrompt[] {
  const templates: PromptTemplate[] = getPromptSet(industrySlug);
  const out: ResolvedPrompt[] = [];
  for (const tpl of templates) {
    if (tpl.national) {
      out.push({ text: tpl.text, city: "(national)", national: true });
      continue;
    }
    for (const city of cities) {
      out.push({ text: tpl.text.replaceAll("{city}", city), city, national: false });
    }
  }
  return out;
}
