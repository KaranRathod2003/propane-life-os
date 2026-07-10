import { cn } from "@/lib/utils";

/** A stable hue per seed, so an account always wears the same colour. */
function hueOf(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/** Initials on a generated gradient — no uploads, no storage bucket. */
export function Avatar({
  seed,
  name,
  size = 36,
  className,
}: {
  seed: string;
  name: string;
  size?: number;
  className?: string;
}) {
  const hue = hueOf(seed);
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white",
        className
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${
          (hue + 40) % 360
        } 70% 42%))`,
      }}
    >
      {initials(name)}
    </span>
  );
}
