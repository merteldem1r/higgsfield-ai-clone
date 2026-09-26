// The spectrum rule under the header and the glow fading down from it, behind every page's head.
// Edge to edge, like the header it sits under, whatever the page's column is.
export function PageRule() {
  return (
    <div aria-hidden className="pointer-events-none relative h-px w-full bg-brand-gradient opacity-50">
      <div className="absolute inset-x-0 top-0 -z-10 h-56 bg-top-glow opacity-60" />
    </div>
  );
}
