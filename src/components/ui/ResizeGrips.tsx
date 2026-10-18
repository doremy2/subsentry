import { useRef, type PointerEvent } from "react";
import { useApp } from "../../state/appContext";

type Axis = "both" | "x" | "y";

/**
 * Right edge, bottom edge and bottom-right corner handles. While one is held the main
 * process moves the window edge with the cursor (minimum/maximum sizes are enforced there),
 * so resizing behaves the same on Windows and macOS. Hidden in a plain browser preview.
 */
export function ResizeGrips() {
  const { platform, beginResize, endResize, reportError } = useApp();
  const active = useRef(false);
  if (platform === "web") return null;

  const handlers = (axis: Axis) => ({
    onPointerDown(e: PointerEvent<HTMLDivElement>) {
      e.preventDefault();
      e.currentTarget.setPointerCapture?.(e.pointerId); // keep receiving events when the cursor leaves the window
      active.current = true;
      void beginResize(axis).catch(reportError);
    },
    onPointerUp: finish,
    onPointerCancel: finish,
    onLostPointerCapture: finish,
  });

  function finish() {
    if (!active.current) return;
    active.current = false;
    void endResize().catch(reportError);
  }

  return (
    <>
      <div data-testid="grip-x" aria-hidden="true" className="absolute bottom-8 right-0 top-14 z-30 w-1.5 cursor-ew-resize" {...handlers("x")} />
      <div data-testid="grip-y" aria-hidden="true" className="absolute bottom-0 left-8 right-8 z-30 h-1.5 cursor-ns-resize" {...handlers("y")} />
      <div data-testid="grip-both" aria-hidden="true" className="group absolute bottom-0 right-0 z-30 grid size-7 cursor-nwse-resize place-items-end p-1.5" {...handlers("both")}>
        <svg width="10" height="10" viewBox="0 0 10 10" className="text-white/25 transition group-hover:text-white/60">
          <path d="M9 1L1 9M9 5L5 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </div>
    </>
  );
}
