import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiPanel } from '../../src/components/AiPanel/AiPanel';
import { AiUnavailableError } from '../../src/lib/ai/ai';
import { makeCookie } from '../chromeMock';
import * as ai from '../../src/lib/ai/ai';

vi.mock('../../src/lib/ai/ai', async () => {
  const actual = await vi.importActual<typeof import('../../src/lib/ai/ai')>('../../src/lib/ai/ai');
  return { ...actual, explainCookie: vi.fn() };
});

const explainCookie = vi.mocked(ai.explainCookie);
const cookie = makeCookie({ name: '_ga', domain: '.example.com' });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AiPanel', () => {
  it('shows the answer and provider badge after explaining', async () => {
    const user = userEvent.setup();
    explainCookie.mockResolvedValue({
      answer: { text: 'This is Google Analytics.', provider: 'claude' },
      turns: [{ role: 'user', content: 'ctx' }],
    });
    render(<AiPanel cookie={cookie} />);
    await user.click(screen.getByRole('button', { name: /explain this cookie/i }));
    expect(await screen.findByText('This is Google Analytics.')).toBeInTheDocument();
    expect(screen.getByText('Claude')).toBeInTheDocument();
  });

  it('offers setup when no backend is available', async () => {
    const user = userEvent.setup();
    explainCookie.mockRejectedValue(new AiUnavailableError());
    render(<AiPanel cookie={cookie} />);
    await user.click(screen.getByRole('button', { name: /explain this cookie/i }));
    expect(await screen.findByRole('button', { name: /set up ai/i })).toBeInTheDocument();
  });

  it('sends a follow-up question', async () => {
    const user = userEvent.setup();
    explainCookie.mockResolvedValue({
      answer: { text: 'Analytics cookie.', provider: 'on-device' },
      turns: [{ role: 'user', content: 'ctx' }],
    });
    render(<AiPanel cookie={cookie} />);
    await user.click(screen.getByRole('button', { name: /explain this cookie/i }));
    await screen.findByText('Analytics cookie.');

    explainCookie.mockResolvedValue({
      answer: { text: 'No, it is functional.', provider: 'on-device' },
      turns: [
        { role: 'user', content: 'ctx' },
        { role: 'assistant', content: 'Analytics cookie.' },
        { role: 'user', content: 'Is it a tracker?' },
      ],
    });
    await user.type(screen.getByLabelText(/follow-up question/i), 'Is it a tracker?');
    await user.click(screen.getByRole('button', { name: 'Ask' }));
    expect(await screen.findByText('No, it is functional.')).toBeInTheDocument();
  });
});
