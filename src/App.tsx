import { useEffect } from "react";
import { ManagerView } from "./components/manager/ManagerView";
import { ErrorState, Spinner } from "./components/ui/Feedback";
import { CompactWidget } from "./components/widget/CompactWidget";
import { WINDOW_MARGIN } from "../electron/shared/windowSizes";
import { ResizeGrips } from "./components/ui/ResizeGrips";
import { useApp } from "./state/appContext";



export function App() {
  const { status, fatalError, retry, preferences } = useApp();

  // Appearance preferences drive CSS variables on <html>.
  useEffect(() => {
    document.documentElement.dataset["theme"] = preferences.theme;
    document.documentElement.dataset["accent"] = preferences.accent;
    document.documentElement.style.setProperty("--surface-alpha", String(preferences.opacity));
  }, [preferences.theme, preferences.accent, preferences.opacity]);

  // A file dropped outside the drop zone must never navigate the window to that file.
  useEffect(() => {
    const block = (e: DragEvent) => e.preventDefault();
    window.addEventListener("dragover", block);
    window.addEventListener("drop", block);
    return () => {
      window.removeEventListener("dragover", block);
      window.removeEventListener("drop", block);
    };
  }, []);

  return (
    <div className="relative h-full" style={{ padding: WINDOW_MARGIN }}>
      {status === "ready" ? (
        preferences.mode === "expanded" ? <ManagerView key="expanded" /> : <CompactWidget key="compact" />
      ) : (
        <div data-drag className="card grid h-full place-items-center rounded-[28px]">
          {status === "error" ? <ErrorState message={fatalError ?? "Unknown error."} onRetry={retry} /> : <Spinner />}
        </div>
      )}
      {status === "ready" && <ResizeGrips />}
    </div>
  );
}
