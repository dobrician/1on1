import { Badge } from "@/components/ui/badge";

interface AmendedBadgeProps {
  isAmended: boolean;
}

export function AmendedBadge({ isAmended }: AmendedBadgeProps) {
  if (!isAmended) return null;
  return (
    <Badge
      variant="outline"
      className="text-xs text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700"
    >
      Amended
    </Badge>
  );
}
