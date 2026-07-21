import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StorageRow } from '../../src/components/StorageRow/StorageRow';

describe('StorageRow', () => {
  const entry = { key: 'theme', value: 'dark' };

  it('expands to show the full value', async () => {
    const user = userEvent.setup();
    render(<StorageRow entry={entry} onEdit={() => {}} onDelete={() => {}} />);
    await user.click(screen.getByTitle('theme'));
    expect(screen.getByText('dark', { selector: '.storage-row__detail-value code' })).toBeInTheDocument();
  });

  it('fires edit and delete with the entry', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<StorageRow entry={entry} onEdit={onEdit} onDelete={onDelete} />);
    await user.click(screen.getByRole('button', { name: 'Edit theme' }));
    expect(onEdit).toHaveBeenCalledWith(entry);
    await user.click(screen.getByRole('button', { name: 'Delete theme' }));
    expect(onDelete).toHaveBeenCalledWith(entry);
  });

  it('shows a JWT badge when the value contains a token', () => {
    const jwt = `${btoa(JSON.stringify({ alg: 'HS256' }))}.${btoa(JSON.stringify({ sub: 'x' }))}.s`
      .replace(/=+/g, '');
    render(<StorageRow entry={{ key: 'token', value: jwt }} onEdit={() => {}} onDelete={() => {}} />);
    expect(screen.getByText('JWT')).toBeInTheDocument();
  });
});
