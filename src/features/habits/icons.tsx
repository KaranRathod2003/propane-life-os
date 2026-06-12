import {
  Activity,
  BookOpen,
  MessagesSquare,
  Rocket,
  Salad,
  Shield,
  Sparkles,
  Sunrise,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  sunrise: Sunrise,
  activity: Activity,
  salad: Salad,
  "book-open": BookOpen,
  shield: Shield,
  "messages-square": MessagesSquare,
  rocket: Rocket,
  sparkles: Sparkles,
};

export function HabitIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = ICONS[name] ?? Sparkles;
  return <Icon className={className} />;
}
