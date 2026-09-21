import { prettyDomain } from "@/lib/types";

/** Matches http(s) URLs and bare "www." links. Trailing punctuation that
 *  usually ends a sentence rather than the URL is left out of the link. */
const URL_RE = /((?:https?:\/\/|www\.)[^\s<]+?)(?=[.,;:!?)\]]*(?:\s|$))/gi;

/**
 * Render free text with every URL turned into a tappable link, labelled
 * by its domain so long article links read cleanly. Used for notes and
 * the "Recommended by" line.
 */
export function LinkedText({ text }: { text: string }) {
  const out: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(URL_RE)) {
    const start = m.index ?? 0;
    const raw = m[1];
    if (start > last) out.push(<span key={i++}>{text.slice(last, start)}</span>);
    const href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    out.push(
      <a
        key={i++}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-coral underline underline-offset-2 break-all"
      >
        {prettyDomain(href)}
      </a>,
    );
    last = start + raw.length;
  }
  if (last < text.length) out.push(<span key={i++}>{text.slice(last)}</span>);
  return <>{out}</>;
}
