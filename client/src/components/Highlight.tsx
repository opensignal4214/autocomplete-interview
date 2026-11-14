/** Lowercase and strip diacritics, keeping a map from each folded char back to its source index. */
function fold(text: string): { folded: string; sourceIndex: number[] } {
  let folded = '';
  const sourceIndex: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const f = text[i].normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    for (let j = 0; j < f.length; j++) {
      folded += f[j];
      sourceIndex.push(i);
    }
  }
  return { folded, sourceIndex };
}

/**
 * Highlights the first occurrence of `query` in `text`.
 * - No RegExp, so queries like "c++" or "(ci" can't throw or mis-match.
 * - Ignores case and diacritics, matching the server: "jose" highlights "José".
 */
export function Highlight({ text, query }: { text: string; query: string }) {
  const q = fold(query.trim()).folded;
  if (!q) return <>{text}</>;

  const { folded, sourceIndex } = fold(text);
  const at = folded.indexOf(q);
  if (at === -1) return <>{text}</>;

  const start = sourceIndex[at];
  const end = sourceIndex[at + q.length - 1] + 1;

  return (
    <>
      {text.slice(0, start)}
      <mark>{text.slice(start, end)}</mark>
      {text.slice(end)}
    </>
  );
}
