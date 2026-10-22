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
    // Henry's own prose, written 2026-10-21. Nothing on this entry is filler now.
    //
    // The screenshot is the two Blender screenshots stacked vertically into one
    // image, which is why it is portrait (1683x2027) where the others are square or
    // wide. The row bounds it by height and it sits narrower than its column; that
    // is the same path the POTS phone capture takes and nothing is cropped.
    //
    // The two captures are the two addons the first paragraph names — FK/IK snapping
    // on top, selection propagation below — so the picture and the words have to be
    // changed together. Replacing one addon in the prose means re-stacking the image.
    slug: 'gsoc-blender-contributions',
    title: 'Google Summer of Code and Blender Contributions',
    date: '2026-08-01',
    blurb:
      "I've been using Blender for many years as a hobbyist and was interested in becoming an open source contributor myself. I had some addons that I had created for personal use, and uploaded those to the public for others to use as well. Those were an IK/FK bone snapping tool, and a selection propagation tool, which have over 10,000 downloads as a whole. From there, I started fixing some bugs and found out about Google Summer of Code.",
    detail: [
      "I submitted a proposal for modeling for edge editing and was very happy to be accepted. My PRs for my project were a port of the Edge Flow addon to native Blender, a clone and slide toggle for edge sliding, and a follow curvature toggle for loop cut. The experience was very interesting as I was coding with minimal agent based assistance, navigating a large codebase and learning to follow Blender's coding conventions. I drastically improved my knowledge of C++, linear algebra, and low level operations through my time working on my GSoC project.",
      'I continue to contribute and I hope that my completed PRs will be merged for an upcoming Blender release soon. :D',
    ],
    tags: ['open-source', 'graphics'],
    links: [
      {
        label: 'GSoC Submission',
        href: 'https://devtalk.blender.org/t/gsoc-2026-new-edge-editing-operations/45200',
      },
      {
        label: 'Extensions',
        href: 'https://extensions.blender.org/author/65907/',
      },
    ],
  },
  {
    slug: 'quantconnect-models',
    title: 'QuantConnect Models',
    // Ties with pots-flareup-predictor; this entry is first in the file and so
    // first on the tab. See the note on dates above before reordering.
    date: '2026-05-11',
    // Henry's own prose, written 2026-10-21, replacing the spec blurb carried over
    // from the old site. Three paragraphs: the Mandelbrotian options model, how it
    // did once published, then the quantum walk model. This is the entry that made
    // `detail` an array (`content/types.ts`).
    //
    // **Its numbers supersede the blurb's, where the two disagree.** That blurb
    // claimed 80%+ CAGR and 1.29 Sharpe for the quantum walk model and 60%+ CAGR
    // across 105 trades for the fractal one; Henry's text says ~55% CAGR and 1.18
    // Sharpe for the fractal model and that the quantum one underperformed once
    // deployed. Those figures lived nowhere else in the repo and are gone with the
    // prose that held them. Do not restore them.
    //
    // The links below are in the order the prose introduces the two models, which
    // is the reverse of the order they were in until today.
    blurb:
      'After reading The Black Swan over Christmas, I had the idea to implement an options trading model in the modern market focused on fat tails and Mandelbrotian volatility. I ended up coming up with a strategy with ~55% CAGR and 1.18 Sharpe ratio, focused on the MAG7 universe and mainly swing trading OTM call options based on signal agreement from a Hurst exponents + multifractal width based core + a technicals based confirmation.',
    detail: [
      "After publishing to QuantConnect, I was pleasantly surprised to see that my model was ranked in the Top 3 for a majority of May and June and I was in the top 2 users in model performance throughout. My model became one of the most popular models on the site, racking up nearly 10,000 clones! It's certainly ignited a personal interest in financial instruments and I might continue to make and deploy models in the future.",
      "My other model I had an idea for was a quantum walk based model after taking a quantum physics course over that same Christmas break, as well as doing extensive research into quantum computers. I developed a second strategy using a Bohmian Quantum Potential strategy, a discrete time quantum walk strategy, and a simple technicals based strategy for mid cap 2x leveraged swing trades. Position sizing was done with quantum stochastic walks as well. This strategy didn't perform as well when deployed, but the community seemed interested in the quantum based experimental strategies pulled from research papers and this strategy has over 16,000 clones. The model excels at mean reversion, and also peaked at top 4 on the leaderboard at one point.",
    ],
    tags: ['quant', 'quantum', 'ml', 'options'],
    links: [
      {
        label: 'Mandelbrotian Volatility',
        href: 'https://www.quantconnect.com/strategies/315/Mandelbrotian-Vol-Clustering-Options-Strat',
      },
      {
        label: 'Quantum Walk BQP',
        href: 'https://www.quantconnect.com/strategies/478/Quantum-Walk-BQP-Mid-Cap-Macro',
      },
    ],
  },
  {
    // Henry's own prose, written 2026-10-21, replacing the one-sentence spec blurb
    // carried over from the old site. Two paragraphs, so `blurb` carries the first
    // and `detail` the second. This is the first entry to use `detail` at all, and
    // using it is what showed that it was styled wrong: it was a dimmer, smaller
    // second tier, which turned the back half of a write-up into fine print. Both
    // paragraphs render at one weight now (`app/desk/page.tsx` § `PARAGRAPH`).
    //
    // The accuracy figure is 27%, and it is deliberate. The blurb this replaced
    // claimed "70%+ flareup detection accuracy 15 minutes in advance"; that number
    // lived nowhere else in the repo and is gone with it. Do not restore it.
    slug: 'pots-flareup-predictor',
    title: 'ML POTS Flareup Predictor',
    date: '2026-05-11',
    blurb:
      "My girlfriend has POTS and used to use this app to track her heart rate and detect flareups that cost her $5 a month. I coded her one for FREE and got her a new heart rate monitor since she always complained that the old one was uncomfortable. What's nice about the Polar H10 is that it also collects ECG data and other useful advanced metrics like time between heartbeats, perfect for training an ML model to not only alert when a POTS flareup is occurring, but also predict when one's likely to happen before it ever does.",
    detail: [
      'I got the idea from a paper on heart rate monitors having a high flareup prediction likelihood for diabetes and thought, "Why not try it for POTS?" The model I used is a BoostedTreeClassifier built into Apple\'s XCode, and I collected 1M+ data entries for about 2 months on the heart monitor before training the model. After some tweaking and optimization I managed to get the prediction accuracy up to a rather unimpressive 27%, which shows just how complex POTS is as a bodily process and certainly increases my appreciation of service dogs! With more data it might be more accurate in testing, and in practice it\'s hard to know just how many flareups it\'s prevented by alerting when likelihood of flareup is high after all. Either way, I think it\'s better to have the app\'s notifications than to not.',
    ],
    tags: ['ml', 'ios', 'health'],
    links: [{ label: 'GitHub', href: 'https://github.com/henryyjiang/potsmonitor' }],
  },
]
