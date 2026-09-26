// Brand-coloured light behind the studio. Invisible at rest; it fades up while a run is live and back down
// when it resolves, so the room lights up only while something is being made. Nothing drifts.
export function AmbientBackground({ active }: { active: boolean }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden transition-opacity duration-1000 ease-out ${
        active ? "opacity-60" : "opacity-0"
      }`}
    >
      <div className="absolute -top-[20vmax] -left-[15vmax] size-[60vmax] rounded-full orb-violet" />
      <div className="absolute top-[15vh] -right-[20vmax] size-[55vmax] rounded-full orb-sky" />
      <div className="absolute -bottom-[30vmax] left-[20vw] size-[65vmax] rounded-full orb-sunset" />
      {/* Film grain so the dark gradients don't band into visible steps. */}
      <div className="absolute inset-0 bg-grain opacity-[0.045] mix-blend-overlay" />
    </div>
  );
}
