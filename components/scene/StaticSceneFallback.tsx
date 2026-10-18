/**
 * What the scene degrades to where WebGL is unavailable: a static composite, no
 * camera, no character. The site must still function as a portfolio, and the three
 * destinations are reachable from the DOM nav regardless of what the canvas is doing
 * (docs/ARCHITECTURE.md § Performance policy).
 *
 * Phase 3 replaces this gradient with a flattened export of the real layers.
 */
export function StaticSceneFallback() {
  return (
    <div
      className="absolute inset-0"
      style={{
        background:
          'linear-gradient(180deg, #13203c 0%, #24395c 45%, #6b4f3a 62%, #2e211c 100%)',
      }}
    />
  )
}
