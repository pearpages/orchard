import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CookieEditor } from '../../src/components/CookieEditor/CookieEditor';
import { ToastProvider } from '../../src/hooks/useToast';
import { type ChromeMock } from '../chromeMock';

const mock = () => chrome as unknown as ChromeMock;

function renderEditor(mode: Parameters<typeof CookieEditor>[0]['mode'], onClose = () => {}) {
  return render(
    <ToastProvider>
      <CookieEditor mode={mode} onClose={onClose} />
    </ToastProvider>,
  );
}

describe('CookieEditor', () => {
  it('disables Save and explains why while the draft is invalid', async () => {
    renderEditor({ kind: 'create' });
    const save = screen.getByRole('button', { name: /create cookie/i });
    expect(save).toBeDisabled();
    expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/domain is required/i)).toBeInTheDocument();
  });

  it('shows the SameSite=None ⇒ Secure rule as a live error', async () => {
    const user = userEvent.setup();
    renderEditor({ kind: 'create' });
    await user.type(screen.getByLabelText(/name/i), 'sid');
    await user.type(screen.getByLabelText(/domain/i), 'example.com');
    await user.selectOptions(screen.getByRole('combobox'), 'no_restriction');
    expect(screen.getByText(/SameSite=None requires the Secure flag/i)).toBeInTheDocument();
    await user.click(screen.getByLabelText(/^secure$/i));
    expect(screen.queryByText(/SameSite=None requires/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create cookie/i })).toBeEnabled();
  });

  it('creates a cookie and closes on save', async () => {
    const user = userEvent.setup();
    let closed = false;
    renderEditor({ kind: 'create', domain: 'example.com' }, () => {
      closed = true;
    });
    await user.type(screen.getByLabelText(/name/i), 'token');
    await user.type(screen.getByLabelText(/value/i), 'abc');
    await user.click(screen.getByRole('button', { name: /create cookie/i }));
    expect(closed).toBe(true);
    const stored = [...mock()._store.values()];
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ name: 'token', value: 'abc', domain: 'example.com' });
  });

  it('prefills fields when editing and saves changes', async () => {
    const user = userEvent.setup();
    const [cookie] = mock()._seed([{ name: 'sid', domain: 'example.com', value: 'old' }]);
    renderEditor({ kind: 'edit', cookie });
    const valueField = screen.getByLabelText(/value/i);
    expect(valueField).toHaveValue('old');
    await user.clear(valueField);
    await user.type(valueField, 'new');
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    expect([...mock()._store.values()][0].value).toBe('new');
  });

  it('surfaces __Host- prefix violations', async () => {
    const user = userEvent.setup();
    renderEditor({ kind: 'create', domain: 'example.com' });
    await user.type(screen.getByLabelText(/name/i), '__Host-sid');
    expect(screen.getByText(/__Host- cookies must be Secure/i)).toBeInTheDocument();
  });
});
