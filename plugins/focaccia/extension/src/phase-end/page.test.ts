// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { initPhaseEnd } from './page';

// The tests run against the real page markup so the id/class contract cannot
// silently drift from phase-end.html.
const pageHtml = readFileSync(join(process.cwd(), 'src/phase-end/phase-end.html'), 'utf8');
const bodyMarkup = pageHtml.slice(pageHtml.indexOf('<body>') + '<body>'.length, pageHtml.indexOf('<script'));

function openPage(search: string): void {
  document.body.innerHTML = bodyMarkup;
  initPhaseEnd(search);
}

describe('Feature: Celebration page for a finished phase', () => {
  describe('Scenario: the tab opens after a focus session', () => {
    it('Given finished=focus&minutes=25, When the page renders, Then the sign celebrates the break in the break theme', () => {
      openPage('?finished=focus&minutes=25');
      expect(document.querySelector('#phase-title')!.textContent).toBe('Break time!');
      expect(document.querySelector('#phase-detail')!.textContent).toBe(
        '25 minutes of focus done. The break is running.',
      );
      expect(document.querySelector('.sign')!.classList.contains('sign--break')).toBe(true);
    });
  });

  describe('Scenario: the tab opens after a break', () => {
    it('Given finished=break, When the page renders, Then the sign calls back to focus in the default theme', () => {
      openPage('?finished=break');
      expect(document.querySelector('#phase-title')!.textContent).toBe('Focus time!');
      expect(document.querySelector('.sign')!.classList.contains('sign--break')).toBe(false);
    });
  });

  describe('Scenario: the user dismisses the page', () => {
    it('Given the page is open, When "Carry on" is clicked, Then the tab closes itself', () => {
      openPage('?finished=focus&minutes=25');
      const close = vi.spyOn(window, 'close').mockImplementation(() => {});
      document.querySelector<HTMLButtonElement>('#carry-on')!.click();
      expect(close).toHaveBeenCalled();
      close.mockRestore();
    });
  });
});
