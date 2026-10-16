/** Cancel the scheduler itself while a scene is off screen or its tab is hidden. */
export function visibilityLoop(host: Element, draw: (time: number, resumed: boolean) => void) {
  let frame: number | null = null;
  let visible = false;
  let disposed = false;
  let resumed = true;
  function tick(time: number) {
    frame = null;
    if (disposed || !visible || document.hidden) return;
    draw(time, resumed);
    resumed = false;
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    if (disposed || !visible || document.hidden) {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      resumed = true;
    } else if (frame === null) {
      frame = requestAnimationFrame(tick);
    }
  }
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
  observer.observe(host);
  document.addEventListener('visibilitychange', sync);
  return () => {
    disposed = true;
    sync();
    observer.disconnect();
    document.removeEventListener('visibilitychange', sync);
  };
}
