import { timingSafeEqual } from 'node:crypto';
import type { SourceAuthenticationResult, SourceAuthenticator } from './types';

/**
 * Local-only shared-secret authentication. It deliberately makes no production
 * identity claim and is replaceable by mTLS, OAuth2 or broker identities later.
 */
export class LocalSourceAuthenticator implements SourceAuthenticator {
  readonly mode = 'local-laboratory' as const;
  readonly configured: boolean;

  public constructor(
    private readonly secret: string,
    private readonly sourceSystemId: string
  ) {
    this.configured = secret.trim().length > 0;
  }

  authenticate(authorization: string | undefined): SourceAuthenticationResult {
    if (!this.configured || !authorization?.startsWith('Bearer ')) return { ok: false };
    const supplied = Buffer.from(authorization.slice('Bearer '.length));
    const expected = Buffer.from(this.secret);
    if (supplied.length !== expected.length) return { ok: false };
    return timingSafeEqual(supplied, expected)
      ? { ok: true, sourceSystemId: this.sourceSystemId }
      : { ok: false };
  }
}
