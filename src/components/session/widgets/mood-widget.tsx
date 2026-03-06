"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface MoodWidgetProps {
  value: number | null;
  onChange: (value: { answerNumeric: number }) => void;
  disabled?: boolean;
  answerConfig?: { labels?: string[] };
}

const MOOD_KEYS = [
  { emoji: "\uD83D\uDE1E", key: "moodVeryUnhappy" },
  { emoji: "\uD83D\uDE41", key: "moodUnhappy" },
  { emoji: "\uD83D\uDE10", key: "moodNeutral" },
  { emoji: "\uD83D\uDE42", key: "moodHappy" },
  { emoji: "\uD83D\uDE04", key: "moodVeryHappy" },
] as const;

export function MoodWidget({
  value,
  onChange,
  disabled,
  answerConfig,
}: MoodWidgetProps) {
  const t = useTranslations("sessions.widgets");
  const labels = answerConfig?.labels;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        {MOOD_KEYS.map((mood, index) => {
          const rating = index + 1;
          const label = labels?.[index] ?? t(mood.key);

          return (
            <button
              key={rating}
              type="button"
              disabled={disabled}
              onClick={() => onChange({ answerNumeric: rating })}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg p-2 transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "disabled:pointer-events-none disabled:opacity-50",
                value === rating
                  ? "scale-110 bg-accent"
                  : "hover:bg-accent/50"
              )}
              aria-label={label}
            >
              <span className="text-3xl" role="img" aria-hidden="true">
                {mood.emoji}
              </span>
            </button>
          );
        })}
      </div>
      {value != null && (
        <p className="text-sm text-muted-foreground">
          {labels?.[value - 1] ?? t(MOOD_KEYS[value - 1]?.key ?? "moodNeutral")}
        </p>
      )}
    </div>
  );
}
