import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Highlight } from './Highlight';

const marked = (text: string, query: string) =>
  render(<Highlight text={text} query={query} />).container.querySelector('mark')?.textContent ?? null;

describe('Highlight', () => {
  it('highlights a case-insensitive match', () => {
    expect(marked('Alex Kim', 'alE')).toBe('Ale');
  });

  it('treats regex special characters literally', () => {
    expect(marked('C++ Build Bot (CI)', 'c++')).toBe('C++');
    expect(marked('C++ Build Bot (CI)', '(ci')).toBe('(CI');
    expect(marked('Dr. Strange $pecial*', '$pecial*')).toBe('$pecial*');
    expect(marked('[Deactivated] Pat Morgan', '[')).toBe('[');
  });

  it('ignores diacritics but highlights the original characters', () => {
    expect(marked('José Álvarez', 'jose')).toBe('José');
    expect(marked('José Álvarez', 'alv')).toBe('Álv');
  });

  it('renders plain text when there is no match or the query is blank', () => {
    expect(marked('Alex Kim', 'zzz')).toBeNull();
    expect(marked('Alex Kim', '   ')).toBeNull();
  });
});
