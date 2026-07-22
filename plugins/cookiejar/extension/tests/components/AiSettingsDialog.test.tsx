import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiSettingsDialog } from '../../src/components/AiSettingsDialog/AiSettingsDialog';
import type { BuiltInStatus } from '../../src/lib/ai/chromeAi';
import * as chromeAi from '../../src/lib/ai/chromeAi';

vi.mock('../../src/lib/ai/chromeAi', () => ({
  builtInStatus: vi.fn(),
  downloadBuiltIn: vi.fn(),
}));

const builtInStatus = vi.mocked(chromeAi.builtInStatus);

function mockStatus(status: BuiltInStatus) {
  builtInStatus.mockResolvedValue(status);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AiSettingsDialog on-device guidance', () => {
  it('shows a download button when the model is downloadable', async () => {
    mockStatus({ state: 'downloadable', reason: 'downloadable' });
    render(<AiSettingsDialog onClose={() => {}} />);
    expect(await screen.findByRole('button', { name: /download on-device model/i })).toBeInTheDocument();
  });

  it('shows the flag guidance when the API is not exposed', async () => {
    mockStatus({ state: 'unavailable', reason: 'no-api' });
    render(<AiSettingsDialog onClose={() => {}} />);
    expect(await screen.findByText(/prompt-api-for-gemini-nano/)).toBeInTheDocument();
  });

  it('shows the hardware message when unavailable', async () => {
    mockStatus({ state: 'unavailable', reason: 'unavailable' });
    render(<AiSettingsDialog onClose={() => {}} />);
    expect(await screen.findByText(/doesn't meet the requirements/i)).toBeInTheDocument();
  });

  it('shows ready when available', async () => {
    mockStatus({ state: 'available', reason: 'ready' });
    render(<AiSettingsDialog onClose={() => {}} />);
    expect(await screen.findByText(/ready on this device/i)).toBeInTheDocument();
  });

  it('always offers the Claude API key field', async () => {
    mockStatus({ state: 'unavailable', reason: 'no-api' });
    render(<AiSettingsDialog onClose={() => {}} />);
    expect(await screen.findByLabelText(/Claude API key/)).toBeInTheDocument();
  });
});
