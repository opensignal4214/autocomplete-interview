import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { searchPeople, type Person } from '../api/people';
import { searchCache } from '../hooks/usePeopleSearch';
import { person } from '../test/fixtures';
import { PeoplePicker } from './PeoplePicker';

vi.mock('../api/people', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/people')>()),
  searchPeople: vi.fn(),
}));
const mockSearch = vi.mocked(searchPeople);

const DIRECTORY = [person('Alex Kim', 'u1'), person('Alex Kim', 'u2'), person('Alexandra Chen', 'u3'), person('Ada Lovelace', 'u4')];

function Harness({ max = 5, initial = [] as Person[] }) {
  const [value, setValue] = useState<Person[]>(initial);
  return <PeoplePicker label="To" value={value} onChange={setValue} max={max} />;
}

describe('PeoplePicker', () => {
  beforeEach(() => {
    searchCache.clear();
    mockSearch.mockReset();
    mockSearch.mockImplementation(async (q) => {
      const items = DIRECTORY.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
      return { items, total: items.length, nextOffset: null };
    });
  });

  it('selects with the keyboard and hides selected people from results', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole('combobox', { name: 'To' });

    await user.type(input, 'alex');
    expect(await screen.findAllByRole('option')).toHaveLength(3);
    expect(input).toHaveAttribute('aria-expanded', 'true');

    await user.keyboard('{ArrowDown}{Enter}'); // second option: the other "Alex Kim" (u2)
    expect(screen.getByRole('button', { name: 'Remove Alex Kim' })).toBeInTheDocument();
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();

    await user.type(input, 'alex');
    const options = await screen.findAllByRole('option');
    expect(options).toHaveLength(2); // u2 is filtered out; the other Alex Kim (u1) is still there
  });

  it('wraps around with arrow keys and closes with Escape', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole('combobox');

    await user.type(input, 'alex');
    await screen.findAllByRole('option');
    await user.keyboard('{ArrowUp}');
    expect(screen.getAllByRole('option')[2]).toHaveAttribute('aria-selected', 'true');
    expect(input.getAttribute('aria-activedescendant')).toBe(screen.getAllByRole('option')[2].id);

    await user.keyboard('{Escape}');
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('removes the last chip with Backspace on an empty input', async () => {
    const user = userEvent.setup();
    render(<Harness initial={[person('Ada Lovelace', 'u4'), person('Alex Kim', 'u1')]} />);
    await user.click(screen.getByRole('combobox'));
    await user.keyboard('{Backspace}');
    expect(screen.queryByRole('button', { name: 'Remove Alex Kim' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Ada Lovelace' })).toBeInTheDocument();
  });

  it('enforces the max and tells the user', async () => {
    const user = userEvent.setup();
    render(<Harness max={1} initial={[person('Ada Lovelace', 'u4')]} />);
    const input = screen.getByRole('combobox');
    expect(input).toHaveAccessibleDescription(/reached the limit of 1/i);

    await user.type(input, 'alex');
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('shows an error with a working retry', async () => {
    const user = userEvent.setup();
    mockSearch.mockRejectedValueOnce(new Error('500'));
    render(<Harness />);

    await user.type(screen.getByRole('combobox'), 'ada');
    await user.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('option', { name: /Ada Lovelace/ })).toBeInTheDocument();
  });
});
