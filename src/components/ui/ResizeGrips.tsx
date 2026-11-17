import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { useApp } from "../../state/appContext";
import {
  cornerIconOffset,
  cornerOffset,
  cornerSize,
  edgeOffset,
  edgeThickness,
  EDGE_END_CORNER,
  EDGE_START_TOP,
} from "./gripGeometry";

type Axis = "both" | "x" | "y";

/**
 * Right edge, bottom edge and bottom-right corner handles, drawn over the card.
 * While one is held the main process moves the window edge with the cursor (min/max sizes are enforced
 * there), so resizing behaves the same on Windows and macOS. Hidden in a plain browser preview.
 *
 * Each handle is explicitly `no-drag`: the header and spend area are window-drag regions, and an
 * overlapping element without it would start a window move instead of a resize.
 */
export function ResizeGrips() {
  const { platform, beginResize, endResize, reportError } = useApp();
  const [active, setActive] = useState<Axis | null>(null);
  const activeRef = useRef(false);
  const stopListening = useRef<(() => void) | null>(null);

  const finish = useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;
    stopListening.current?.();
    stopListening.current = null;
    setActive(null);
    void endResize().catch(reportError);
  }, [endResize, reportError]);

  // A drag that is still running when the grips unmount must not leave the window following the cursor.
  useEffect(() => finish, [finish]);

  if (platform === "web") return null;

  const handlers = (axis: Axis) => ({
    onPointerDown(e: PointerEvent<HTMLDivElement>) {
      if (e.button !== 0 || activeRef.current) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture?.(e.pointerId); // keep receiving events when the cursor leaves the window
      activeRef.current = true;
      setActive(axis);
      // Releasing anywhere (even outside the window), a cancelled pointer, or losing focus ends the drag.
      const stop = () => finish();
      window.addEventListener("pointerup", stop);
      window.addEventListener("pointercancel", stop);
      window.addEventListener("blur", stop);
      stopListening.current = () => {
        window.removeEventListener("pointerup", stop);
        window.removeEventListener("pointercancel", stop);
        window.removeEventListener("blur", stop);
      };
      void beginResize(axis).catch((error: unknown) => {
        finish();
        reportError(error);
      });
    },
  });

  const lit = (axis: Axis) => (active === axis ? "opacity-100" : "opacity-0 group-hover:opacity-80");

  return (
    <>
      {/* Right edge: a pill appears on hover, the strip itself is invisible. */}
      <div
        data-testid="grip-x"
        title="Drag to resize"
        className="no-drag group absolute z-30 cursor-ew-resize touch-none"
        style={{ right: edgeOffset, width: edgeThickness, top: EDGE_START_TOP, bottom: EDGE_END_CORNER }}
        {...handlers("x")}
      >
        <span aria-hidden="true" className={`pointer-events-none absolute right-[9px] top-1/2 h-14 w-[3px] -translate-y-1/2 rounded-full bg-accent transition-opacity duration-150 ${lit("x")}`} />
      </div>

      {/* Bottom edge */}
      <div
        data-testid="grip-y"
        title="Drag to resize"
        className="no-drag group absolute z-30 cursor-ns-resize touch-none"
        style={{ bottom: edgeOffset, height: edgeThickness, left: EDGE_START_TOP, right: EDGE_END_CORNER }}
        {...handlers("y")}
      >
        <span aria-hidden="true" className={`pointer-events-none absolute bottom-[9px] left-1/2 h-[3px] w-14 -translate-x-1/2 rounded-full bg-accent transition-opacity duration-150 ${lit("y")}`} />
      </div>

      {/* Corner: always faintly visible so people can find it; brightens on hover and while dragging. */}
      <div
        data-testid="grip-both"
        title="Drag to resize"
        className="no-drag group absolute z-30 cursor-nwse-resize touch-none"
        style={{ right: cornerOffset, bottom: cornerOffset, width: cornerSize, height: cornerSize }}
        {...handlers("both")}
      >
        <svg
          aria-hidden="true"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          className={`pointer-events-none absolute transition-colors duration-150 ${active === "both" ? "text-accent" : "text-white/35 group-hover:text-accent"}`}
          style={{ right: cornerIconOffset, bottom: cornerIconOffset }}
        >
          <path d="M11 1L1 11M11 6L6 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        </svg>
      </div>
    </>
  );
}
