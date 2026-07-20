import { execSync } from 'node:child_process';

/** The e2e suite always exercises a fresh build of the extension. */
export default function globalSetup(): void {
  execSync('node scripts/build.mjs', { stdio: 'inherit' });
}
