// Slow brand-colored light behind the thread. It brightens and breathes while a generation runs, so the
// page's energy follows real state instead of moving for its own sake. Static under reduced motion.
export function AmbientBackground({ active }: { active: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ease-out ${active ? "opacity-85" : "opacity-35"}`}
      >
        <div className={`absolute inset-0 ${active ? "motion-safe:animate-ambient-pulse" : ""}`}>
          <div className="absolute -top-[20vmax] -left-[15vmax] size-[60vmax] rounded-full orb-violet will-change-transform motion-safe:animate-drift-a" />
          <div className="absolute top-[15vh] -right-[20vmax] size-[55vmax] rounded-full orb-sky will-change-transform motion-safe:animate-drift-b" />
          <div className="absolute -bottom-[30vmax] left-[20vw] size-[65vmax] rounded-full orb-sunset will-change-transform motion-safe:animate-drift-c" />
        </div>
      </div>
      <div className="absolute inset-0 bg-grain opacity-[0.045] mix-blend-overlay" />
    </div>
  );
}
