import { OverlayPanel } from '@/components/overlay/OverlayPanel'
import { ART_PIECES } from '@/content/art'
import { byDateDesc } from '@/content/types'
import { SOCIAL_LINKS } from '@/content/links'

/**
 * The drawing portfolio.
 *
 * `content/art.ts` is empty on purpose — the old site had no art catalogue, only a
 * link out, so there was nothing to carry over and nothing was invented. The empty
 * state says so rather than pretending to be a loading screen.
 *
 * How this should be presented — grid, reel, lightbox — is an open question in
 * docs/ROADMAP.md and belongs to Phase 4.
 */
export default function ArtPage() {
  const pieces = byDateDesc(ART_PIECES)
  const tiktok = SOCIAL_LINKS.find((link) => link.label === 'TikTok')

  return (
    <OverlayPanel title="Art">
      {pieces.length === 0 ? (
        <div className="flex flex-col gap-3 text-sm opacity-80">
          <p>Nothing catalogued here yet.</p>
          <p className="opacity-70">
            Add pieces to <code className="opacity-90">content/art.ts</code>. How the
            portfolio should look is still undecided — see docs/ROADMAP.md, Phase 4.
          </p>
          {tiktok ? (
            <p>
              In the meantime, the animation work is on{' '}
              <a href={tiktok.href} target="_blank" rel="noreferrer" className="underline">
                TikTok
              </a>
              .
            </p>
          ) : null}
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4">
          {pieces.map((piece) => (
            <li key={piece.slug} className="flex flex-col gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={piece.image} alt={piece.title} className="w-full rounded" />
              <h2 className="text-sm font-medium">{piece.title}</h2>
              {piece.caption ? (
                <p className="text-xs opacity-70">{piece.caption}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </OverlayPanel>
  )
}
