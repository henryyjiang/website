/**
 * Software and AI research work. Surfaced in the desk panel.
 *
 * DATES NEED REVIEW. The old site's markup carried no dates at all, so these were
 * derived from the archived git history — the date each entry first appeared in
 * `index.html` on the `archive/old-site` branch. That is an *upper bound* on when
 * the work was done, not the work's date, and three of them (POTS, Hawkes, Quantum
 * Walk) share 2026-05-11 only because that is when the projects section was
 * reorganised in one commit.
 *
 * Henry should correct these. Nothing else depends on their precision — the list
 * sorts on `date`, so fixing a date reorders the list and changes nothing else.
 *
 * Screenshots live at `art/projects/<slug>.png` and are resolved by slug through
 * `lib/content-images.ts`, so no entry below writes an image path. The eight carried
 * over from the old site pointed at `/assets/`, which was never under `public/` and
 * 404'd for every one of them. The desk panel does not render them yet — that is
 * Phase 7 in docs/ROADMAP.md — but the pipeline carries them.
 *
 * See docs/CONTENT.md.
 */

import type { Project } from './types'

export const PROJECTS: readonly Project[] = [
  {
    slug: 'fwubbo',
    title: 'fwubbo: Personal Dashboard Wrapper',
    date: '2026-04-07',
    blurb:
      'A personal dashboard for daily use. Streams the Claude API to modify widgets and create new widgets and themes, so every visualisation tool I have made lives in one place.',
    tags: ['tooling', 'ai', 'full-stack'],
    links: [{ label: 'GitHub', href: 'https://github.com/henryyjiang/fwubbo' }],
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
  {
    slug: 'kinetic-hawkes-hft',
    title: 'Self-Excitatory Hawkes Process + Kinetic Theory HFT Model',
    date: '2026-05-11',
    blurb:
      'Built on two weeks of MSFT L3 data for a kinetic queue-prediction market making strategy, achieving 49% PnL. The Hawkes process strategy was calibrated with MLE and reached a 65% win rate across 54M+ MBO events.',
    tags: ['quant', 'market-microstructure'],
    links: [{ label: 'Write-up', href: 'https://henryyjiang.github.io/kinetichawkes/' }],
  },
  {
    slug: 'quantum-walk-bqp',
    title: 'Quantum Walk BQP Trading Model',
    date: '2026-05-11',
    blurb:
      'Mid-cap macro equity model combining BQP and discrete quantum walk strategies, reaching 80%+ CAGR and 1.29 Sharpe with quantum stochastic walk asset correlation position sizing.',
    tags: ['quant', 'quantum'],
    links: [
      {
        label: 'QuantConnect',
        href: 'https://www.quantconnect.com/strategies/478/Quantum-Walk-BQP-Mid-Cap-Macro',
      },
    ],
  },
  {
    slug: 'mandelbrotian-volatility',
    title: 'Mandelbrotian Volatility Options ML Model',
    date: '2026-02-02',
    blurb:
      'A fractal regime-detection OTM options strategy using Hurst exponents (DFA), Hill tail-index and multifractal spectral width to classify volatility regimes, achieving 60%+ CAGR and 1.18 Sharpe across 105 trades from 2020–2025.',
    tags: ['quant', 'ml', 'options'],
    links: [
      {
        label: 'QuantConnect',
        href: 'https://www.quantconnect.com/strategies/315/Mandelbrotian-Vol-Clustering-Options-Strat',
      },
    ],
  },
  {
    slug: 'darwin',
    title: 'Darwin: Agentic Evolving GPT',
    date: '2025-10-25',
    blurb:
      'A proof-of-concept Darwin-Gödel model: genetic algorithms applied to GPT agents that iteratively modify and improve their own training code, with a live chat window letting the model request new datasets and library upgrades.',
    detail:
      'I plan to continue this with finetuning 30B models and removing the API calls.',
    tags: ['ai', 'research', 'agents'],
    links: [
      { label: 'GitHub', href: 'https://github.com/henryyjiang/DARWIN' },
      { label: 'arXiv', href: 'http://arxiv.org/abs/2602.05848' },
    ],
  },
  {
    slug: 'batstick',
    title: 'Batstick: Smart Walking Aid',
    date: '2026-04-07',
    blurb:
      'A walking aid for the visually impaired, designed with VIBUG. Converts ultrasonic readings into an array of vibration motors conveying object position with over 80% accuracy.',
    detail: 'Featured on Fox News and placed Top 12 at the National Innovator Challenge.',
    tags: ['hardware', 'accessibility'],
    links: [],
  },
  {
    slug: 'automated-intersection',
    title: 'Automated Intersection Management for Self-Driving Vehicles',
    date: '2025-10-25',
    blurb:
      'An AI intersection management system improving simulated traffic flow by 50% using Pygame, Q-learning and a Double Q-table approach, plus a physical Raspberry Pi car running YOLOv3-mini and OpenCV for lane detection and motor control.',
    tags: ['ml', 'robotics', 'rl'],
    links: [
      {
        label: 'GitHub',
        href: 'https://github.com/henryyjiang/automatedintersectionmanagement',
      },
    ],
  },
]
