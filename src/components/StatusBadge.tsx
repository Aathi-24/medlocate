import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  available: boolean;
  label: string;
}

export function StatusBadge({ available, label }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
        available
          ? "bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]"
          : "bg-[hsl(var(--destructive)/0.12)] text-destructive"
      )}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          available ? "bg-[hsl(var(--success))]" : "bg-destructive"
        )}
      />
      {label}: {available ? "Available" : "Not Available"}
    </span>
  );
}
