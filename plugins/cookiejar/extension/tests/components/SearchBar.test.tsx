import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { SearchBar } from '../../src/components/SearchBar/SearchBar';

function Harness(props: { slashShortcut?: boolean }) {
  const [value, setValue] = useState('');
  return <SearchBar value={value} onChange={setValue} slashShortcut={props.slashShortcut} />;
}

describe('SearchBar', () => {
  it('updates as the user types and clears via the × button', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole('searchbox', { name: /search cookies/i });
    await user.type(input, 'auth0');
    expect(input).toHaveValue('auth0');
    await user.click(screen.getByRole('button', { name: /clear search/i }));
    expect(input).toHaveValue('');
  });

  it('focuses the input when "/" is pressed with slashShortcut', async () => {
    const user = userEvent.setup();
    render(<Harness slashShortcut />);
    const input = screen.getByRole('searchbox', { name: /search cookies/i });
    expect(input).not.toHaveFocus();
    await user.keyboard('/');
    expect(input).toHaveFocus();
    // and the "/" itself must not be typed into the field
    expect(input).toHaveValue('');
  });
});
