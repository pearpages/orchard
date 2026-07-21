import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DomainGroup } from '../../src/components/DomainGroup/DomainGroup';
import type { DomainGroup as DomainGroupData } from '../../src/lib/filter';
import { makeCookie } from '../chromeMock';

function renderGroup(cookieCount: number) {
  const group: DomainGroupData = {
    domain: 'big.example.com',
    pinned: false,
    cookies: Array.from({ length: cookieCount }, (_, i) =>
      makeCookie({ name: `cookie-${String(i).padStart(3, '0')}`, domain: 'big.example.com' }),
    ),
  };
  return render(
    <DomainGroup
      group={group}
      domainProtected={false}
      isProtected={() => false}
      onTogglePin={() => {}}
      onToggleProtectDomain={() => {}}
      onExportDomain={() => {}}
      onDeepClean={() => {}}
      onDeleteDomain={() => {}}
      onDelete={() => {}}
      onEdit={() => {}}
      onToggleProtect={() => {}}
    />,
  );
}

describe('DomainGroup row cap', () => {
  it('renders all rows when under the cap', () => {
    const { container } = renderGroup(5);
    expect(container.querySelectorAll('.cookie-row')).toHaveLength(5);
    expect(screen.queryByText(/Show all/)).not.toBeInTheDocument();
  });

  it('caps at 100 rows and expands via "Show all"', async () => {
    const user = userEvent.setup();
    const { container } = renderGroup(150);
    expect(container.querySelectorAll('.cookie-row')).toHaveLength(100);
    await user.click(screen.getByRole('button', { name: 'Show all 150 cookies' }));
    expect(container.querySelectorAll('.cookie-row')).toHaveLength(150);
  });
});
