import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

export function BrutalCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`border-2 border-border bg-card p-4 ${className}`}>{children}</div>;
}

export function BrutalButton({
  className = "",
  fill = false,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { fill?: boolean }) {
  return (
    <button
      {...props}
      className={`border-2 border-border px-4 py-3 font-bold uppercase tracking-wide transition-colors disabled:opacity-40 ${
        fill ? "bg-fg text-bg hover:opacity-90" : "bg-transparent text-fg hover:bg-fg/5"
      } ${className}`}
    />
  );
}

export function BrutalInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full border-2 border-border bg-bg px-3 py-2 text-fg placeholder:text-muted-fg focus:outline-none focus:ring-2 focus:ring-accent-blue ${className}`}
    />
  );
}

export function BrutalTextarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full border-2 border-border bg-bg px-3 py-2 text-fg placeholder:text-muted-fg focus:outline-none focus:ring-2 focus:ring-accent-blue ${className}`}
    />
  );
}

export function BrutalLabel({ children }: { children: ReactNode }) {
  return <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-fg">{children}</label>;
}

export function BrutalChip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-2 border-border px-3 py-1.5 text-sm font-bold uppercase ${
        active ? "bg-fg text-bg" : "bg-transparent text-fg"
      }`}
    >
      {children}
    </button>
  );
}
