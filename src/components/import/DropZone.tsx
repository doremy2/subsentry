import { useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { Icon } from "../ui/Icon";

interface Props {
  onFile: (file: File) => void;
  disabled?: boolean;
}

/** Drag-and-drop target that is also a keyboard-accessible "choose file" button. Files stay on this device. */
export function DropZone({ onFile, disabled }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const open = () => !disabled && input.current?.click();

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file && !disabled) onFile(file);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Drop a CSV file here, or press Enter to choose one"
      aria-disabled={disabled}
      data-testid="dropzone"
      onClick={open}
      onKeyDown={onKeyDown}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition focus-visible:outline-2 focus-visible:outline-accent ${
        dragging ? "border-accent bg-accent/10" : "border-white/15 bg-white/[0.03] hover:border-white/30 hover:bg-white/[0.06]"
      } ${disabled ? "pointer-events-none opacity-50" : ""}`}
    >
      <span className="text-accent"><Icon name="upload" size={32} /></span>
      <div>
        <p className="font-medium">Drop a bank or card CSV here</p>
        <p className="mt-1 text-sm text-white/50">or click to choose a file</p>
      </div>
      <input
        ref={input}
        type="file"
        accept=".csv,text/csv,text/plain"
        aria-label="Choose CSV file"
        className="hidden"
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = ""; // allow choosing the same file again
        }}
      />
    </div>
  );
}
