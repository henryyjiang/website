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
 * the work was done, not the work's date. Only the month and year are ever shown,
 * so the day is filler throughout.
 *
 * `quantconnect-models` is the one Henry has set himself: June 2026 on 2026-10-21,
 * then **May 2026 later the same day**, so that it agrees with the post announcing
 * it in `content/posts.ts`, which is dated 2026-05-11. A project that postdates its
 * own announcement reads as an error to anyone comparing the two tabs.
 *
 * That gives it the same date as `pots-flareup-predictor`. The two therefore tie,
 * and a tie is settled by array position, because `byDateDesc` sorts stably and
 * `localeCompare` returns 0 for equal strings. QuantConnect is above POTS in this
 * file and so appears above it on the tab. **Reordering these two objects would
 * silently reorder the Coding tab**, which is the hazard `content/types.ts` warns
 * about: the date decides the order and is displayed nowhere precise enough to show
 * you that it did.
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
    // FILLER, added 2026-10-21. The title and the date are Henry's; everything else
    // is a placeholder written to hold the row's shape until he fills it in. It has
    // no screenshot yet, which the import warns about and the row renders without —
    // drop one at art/projects/cortex-rdm-paper.png to give it a picture.
    //
    // Dated ahead of today on purpose: the paper is in progress and November is when
    // he expects it. The list sorts on `date`, so it leads until something newer
    // lands.
    slug: 'cortex-rdm-paper',
    title: 'Cortex RDM Architecture WIP Paper',
    date: '2026-11-01',
    blurb:
      'FILLER — a paper in progress on the Cortex RDM architecture. Replace this with what the work actually is.',
    tags: ['research', 'ml', 'architecture'],
    links: [],
  },
  {
    // FILLER, added 2026-10-21. Same as above: title and date are Henry's, the blurb
    // is a placeholder, and there is no screenshot at art/projects/ for it yet.
    slug: 'gsoc-blender-contributions',
    title: 'GSoC and Blender Contributions',
    date: '2026-08-01',
    blurb:
      'FILLER — Google Summer of Code, and contributions to Blender. Replace this with what the work actually is.',
    tags: ['open-source', 'graphics'],
    links: [],
  },
  {
    slug: 'quantconnect-models',
    title: 'QuantConnect Models',
    // Ties with pots-flareup-predictor; this entry is first in the file and so
    // first on the tab. See the note on dates above before reordering.
    date: '2026-05-11',
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
