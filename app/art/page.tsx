import { Suspense } from 'react'

import { ArtGallery, type GalleryPiece } from '@/components/overlay/ArtGallery'
import { LinkRow } from '@/components/overlay/LinkRow'
import { OverlayPanel } from '@/components/overlay/OverlayPanel'
import { ART_PIECES } from '@/content/art'
import { ART_LINKS } from '@/content/links'
import { byDateDesc } from '@/content/types'
import { imageFor } from '@/lib/content-images'

/**
 * The drawing portfolio: a 3-wide grid, each cell opening a popup over the page.
 *
 * Images are resolved by slug from the import manifest here, on the server, and
 * handed to the gallery already joined — `imageFor` reads a file that is generated at
 * build time, so there is nothing for the client to look up. **A piece may be a
 * video**, and nothing in `content/art.ts` says which: the file in `art/pieces/`
 * decides, the import records it, and the popup plays what it is given
 * (docs/CONTENT.md § Images).
 *
 * The gallery is a client component because the popup is a URL state it manages
 * through the History API, which is also what lets a blog post link straight to a
 * piece. `useSearchParams` seeds that, hence the Suspense boundary: without one it
 * would opt the whole route out of static rendering.
 */
export default function ArtPage() {
  const pieces: GalleryPiece[] = byDateDesc(ART_PIECES).map((piece) => ({
    ...piece,
    media: imageFor('pieces', piece.slug),
  }))

  return (
    <OverlayPanel>
      <div className="mb-8">
        <LinkRow links={ART_LINKS} label="Elsewhere" />
      </div>

      {pieces.length === 0 ? (
        <p className="text-sm text-muted">
          Nothing catalogued here yet. Add pieces to <code>content/art.ts</code> and drop their
          images — or videos — into <code>art/pieces/</code>.
        </p>
      ) : (
        <Suspense fallback={null}>
          <ArtGallery pieces={pieces} />
        </Suspense>
      )}
    </OverlayPanel>
  )
}
