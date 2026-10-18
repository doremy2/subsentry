import { Icon } from "./Icon";
import { Button } from "./Button";

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className="flex flex-col items-center gap-3 text-sm text-white/60">
      <span className="size-7 animate-spin rounded-full border-2 border-white/15 border-t-accent" />
      {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex max-w-[260px] flex-col items-center gap-3 text-center">
      <span className="text-danger"><Icon name="alert" size={28} /></span>
      <p className="text-sm font-medium">Something went wrong</p>
      <p className="text-xs leading-relaxed text-white/55">{message}</p>
      {onRetry && <Button onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function NoticeBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div role="alert" className="animate-fade-up flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
      <span className="mt-px shrink-0"><Icon name="alert" size={14} /></span>
      <span className="flex-1">{message}</span>
      <button type="button" aria-label="Dismiss" onClick={onDismiss} className="opacity-70 hover:opacity-100">
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}
