import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TokenPanel } from '../../src/components/TokenPanel/TokenPanel';

function b64url(obj: unknown): string {
  return btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

describe('TokenPanel', () => {
  it('renders nothing for plain values', () => {
    const { container } = render(<TokenPanel value="just-a-session-id" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows decoded claims and expiry for a JWT', () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const jwt = `${b64url({ alg: 'RS256', typ: 'JWT' })}.${b64url({ sub: 'auth0|123', iss: 'https://tenant.auth0.com/', exp })}.sig`;
    render(<TokenPanel value={jwt} />);
    expect(screen.getByText('JWT')).toBeInTheDocument();
    expect(screen.getByText(/Expires in (1 h|60 min)/)).toBeInTheDocument();
    expect(screen.getByText('auth0|123')).toBeInTheDocument();
    expect(screen.getByText('https://tenant.auth0.com/')).toBeInTheDocument();
  });

  it('marks expired tokens', () => {
    const exp = Math.floor(Date.now() / 1000) - 600;
    const jwt = `${b64url({ alg: 'HS256' })}.${b64url({ exp })}.s`;
    render(<TokenPanel value={jwt} />);
    expect(screen.getByText(/Expired 10 min ago/)).toBeInTheDocument();
  });

  it('renders base64 JSON blobs', () => {
    render(<TokenPanel value={btoa(JSON.stringify({ theme: 'dark' }))} />);
    expect(screen.getByText('Base64 JSON')).toBeInTheDocument();
    expect(screen.getByText(/"theme": "dark"/)).toBeInTheDocument();
  });
});
