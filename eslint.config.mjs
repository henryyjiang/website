import coreWebVitals from 'eslint-config-next/core-web-vitals'
import typescript from 'eslint-config-next/typescript'

/**
 * eslint-config-next 16 ships flat config arrays directly, so there is no need for
 * the `FlatCompat` shim the older Next templates use.
 *
 * This config is also the reason package.json installs TypeScript the way it does.
 * eslint-config-next depends on typescript-eslint, which refuses to load against
 * the TypeScript 7 API (typescript-eslint#10940), and every entry point of
 * eslint-config-next pulls it in — so with a plain `typescript@7` install, `npm run
 * lint` cannot run at all. The fix is Microsoft's documented side-by-side layout:
 *
 *   "@typescript/native": "npm:typescript@7.0.2"        -> provides the `tsc` binary
 *   "typescript": "npm:@typescript/typescript6@6.0.2"   -> provides the 6.0 JS API
 *
 * So `npm run typecheck` still compiles with TypeScript 7.0.2 as the stack table in
 * CLAUDE.md specifies, while ESLint gets the 6.0 API it needs. Collapse this back to
 * a single `typescript` dependency once typescript-eslint supports TS >= 7.1.
 *
 * @type {import('eslint').Linter.Config[]}
 */
const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'out/**',
      // The previous vanilla site, kept on disk as reference only. Henry decides
      // when it goes; until then it is not ours to lint.
      'assets/**',
      'main.js',
    ],
  },
  ...coreWebVitals,
  ...typescript,
]

export default config
