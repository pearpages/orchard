import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from '../../src/components/ConfirmDialog/ConfirmDialog';

describe('ConfirmDialog', () => {
  it('confirms and cancels', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        title="Delete cookies?"
        body="3 cookies will be deleted."
        confirmLabel="Delete"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledOnce();
    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('keeps confirm disabled until the challenge text is typed exactly', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        title="Delete ALL cookies?"
        body="Everything will be deleted."
        confirmLabel="Delete everything"
        requireText="DELETE"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );
    const confirm = screen.getByRole('button', { name: 'Delete everything' });
    expect(confirm).toBeDisabled();
    const input = screen.getByRole('textbox');
    await user.type(input, 'delete');
    expect(confirm).toBeDisabled();
    await user.clear(input);
    await user.type(input, 'DELETE');
    expect(confirm).toBeEnabled();
  });
});
