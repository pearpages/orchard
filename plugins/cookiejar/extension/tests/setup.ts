import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { createChromeMock } from './chromeMock';

beforeEach(() => {
  vi.stubGlobal('chrome', createChromeMock());
});

afterEach(() => {
  cleanup();
});
