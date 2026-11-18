/**
 * Fixed deep-space backdrop: drifting aurora blobs, a perspective grid that
 * fades toward the edges, and a sparse static star field. Pure CSS so it costs
 * almost nothing; animations stop automatically under reduced motion.
 */
export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-bg">
      <div
        className="absolute -left-[20%] -top-[30%] h-[80vh] w-[70vw] animate-aurora-drift rounded-full blur-[120px]"
        style={{ background: 'rgb(var(--c-violet) / var(--aurora-alpha))' }}
      />
      <div
        className="absolute -right-[15%] top-[10%] h-[70vh] w-[55vw] animate-aurora-drift rounded-full blur-[130px] [animation-delay:-7s]"
        style={{ background: 'rgb(var(--c-cyan) / calc(var(--aurora-alpha) * 0.8))' }}
      />
      <div
        className="absolute -bottom-[35%] left-[25%] h-[70vh] w-[60vw] animate-aurora-drift rounded-full blur-[140px] [animation-delay:-14s]"
        style={{ background: 'rgb(var(--c-magenta) / calc(var(--aurora-alpha) * 0.6))' }}
      />

      {/* Perspective grid floor */}
      <div className="absolute inset-x-0 bottom-0 h-[55vh] [perspective:600px]">
        <div
          className="absolute inset-0 origin-bottom [transform:rotateX(62deg)]"
          style={{
            backgroundImage:
              'linear-gradient(rgb(var(--c-grid) / var(--grid-alpha)) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--c-grid) / var(--grid-alpha)) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
            maskImage: 'radial-gradient(ellipse 70% 90% at 50% 100%, #000 20%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 90% at 50% 100%, #000 20%, transparent 75%)',
          }}
        />
      </div>

      {/* Dot matrix, top area */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(rgb(var(--c-border) / calc(var(--grid-alpha) * 0.9)) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(ellipse 60% 50% at 50% 0%, #000 0%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse 60% 50% at 50% 0%, #000 0%, transparent 70%)',
        }}
      />

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgb(var(--c-bg)/0.85)_100%)]" />
    </div>
  );
}
