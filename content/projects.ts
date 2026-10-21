/**
 * Software and AI research work. Surfaced in the desk panel.
 *
 * **Trimmed to two entries on 2026-10-21.** The eight carried over from the old
 * site were everything Henry had ever shipped; the Coding tab is a portfolio rather
 * than a CV, so it now holds the two he wants shown. The other six — fwubbo, the
 * Hawkes/kinetic HFT model, Darwin, Batstick and the automated intersection — are in
 * git history along with their screenshots, and restoring one is adding its object
 * back and dropping its `art/projects/<slug>.png` back in. Nothing else referenced
 * them except two blog posts, which went with them.
 *
 * The two QuantConnect strategies used to be separate rows and are now one, because
 * they are the same kind of thing published in the same place and read better as a
 * pair than as two entries competing on CAGR.
 *
 * DATES NEED REVIEW. The old site's markup carried no dates at all, so these were
 * derived from the archived git history — the date each entry first appeared in
 * `index.html` on the `archive/old-site` branch. That is an *upper bound* on when
 * the work was done, not the work's date. `quantconnect-models` is the exception and
 * is right: Henry dated it June 2026 himself on 2026-10-21. Only the month and year
 * are ever shown, so the day is filler.
 *
 * Its screenshot is the two backtests stacked into one square image — both strategies
 * are in one row now, so one picture has to show both.
 *
 * Henry should correct these. Nothing else depends on their precision — the list
 * sorts on `date`, so fixing a date reorders the list and changes nothing else.
 *
 * Screenshots live at `art/projects/<slug>.png` and are resolved by slug through
 * `lib/content-images.ts`, so no entry below writes an image path.
 *
 * See docs/CONTENT.md.
 */

import type { Project } from './types'

export const PROJECTS: readonly Project[] = [
  {
    slug: 'quantconnect-models',
    title: 'QuantConnect Models',
    date: '2026-06-11',
    blurb:
      'Two systematic strategies published on QuantConnect. A mid-cap macro equity model combining BQP and discrete quantum walk strategies reaches 80%+ CAGR and 1.29 Sharpe, sizing positions by quantum stochastic walk asset correlation. A fractal regime-detection OTM options strategy classifies volatility regimes with Hurst exponents (DFA), Hill tail-index and multifractal spectral width, reaching 60%+ CAGR and 1.18 Sharpe across 105 trades from 2020–2025.',
    tags: ['quant', 'quantum', 'ml', 'options'],
    links: [
      {
        label: 'Quantum Walk BQP',
        href: 'https://www.quantconnect.com/strategies/478/Quantum-Walk-BQP-Mid-Cap-Macro',
      },
      {
        label: 'Mandelbrotian Volatility',
        href: 'https://www.quantconnect.com/strategies/315/Mandelbrotian-Vol-Clustering-Options-Strat',
      },
    ],
  },
  {
    slug: 'pots-flareup-predictor',
    title: 'ML POTS Flareup Predictor',
    date: '2026-05-11',
    blurb:
      'Full-stack iOS app connecting over BLE to collect 1M+ entries of live heart rate and ECG data, with a boosted tree classifier reaching 70%+ flareup detection accuracy 15 minutes in advance.',
    tags: ['ml', 'ios', 'health'],
    links: [{ label: 'GitHub', href: 'https://github.com/henryyjiang/potsmonitor' }],
  },
]
