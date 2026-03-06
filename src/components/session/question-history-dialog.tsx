"use client";

import { useMemo } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScoreSparkline } from "./score-sparkline";
import { cn } from "@/lib/utils";

export interface PreviousSession {
  id: string;
  sessionNumber: number;
  completedAt: string;
  sessionScore: string | null;
  sharedNotes: Record<string, string> | null;
  answers: Array<{
    questionId: string;
    questionText: string;
    answerType: string;
    answerText: string | null;
    answerNumeric: string | null;
    answerJson: unknown;
    category: string;
  }>;
}

export interface QuestionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questionId: string;
  questionText: string;
  answerType: string;
  previousSessions: PreviousSession[];
}

// formatDate is now handled inline via useFormatter().dateTime()

function formatAnswerValue(
  answerType: string,
  answerText: string | null,
  answerNumeric: string | null,
  answerJson: unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic translation keys
  t: (key: any) => string
): React.ReactNode {
  switch (answerType) {
    case "yes_no": {
      const value = answerText?.toLowerCase();
      if (value === "yes") {
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{t("yes")}</Badge>;
      }
      if (value === "no") {
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">{t("no")}</Badge>;
      }
      return <span className="text-muted-foreground">{t("noAnswer")}</span>;
    }
    case "rating_1_5": {
      if (answerNumeric === null) {
        return <span className="text-muted-foreground">{t("noAnswer")}</span>;
      }
      const v = Number(answerNumeric);
      return (
        <span className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star
              key={i}
              className={cn("h-4 w-4", i <= v ? "fill-amber-400 text-amber-400" : "text-muted-foreground/25")}
            />
          ))}
        </span>
      );
    }
    case "rating_1_10": {
      if (answerNumeric === null) {
        return <span className="text-muted-foreground">{t("noAnswer")}</span>;
      }
      const v = Number(answerNumeric);
      return (
        <span className="flex items-center gap-0.5">
          {Array.from({ length: 10 }, (_, i) => (
            <span
              key={i}
              className={cn("h-2.5 w-3.5 rounded-sm", i < v ? "bg-primary" : "bg-muted-foreground/20")}
            />
          ))}
          <span className="ml-1.5 text-xs text-muted-foreground">{v}/10</span>
        </span>
      );
    }
    case "mood": {
      if (answerNumeric === null) {
        return <span className="text-muted-foreground">{t("noAnswer")}</span>;
      }
      const MOOD_EMOJIS = ["😞", "😟", "😐", "🙂", "😄"];
      const v = Number(answerNumeric);
      const emoji = MOOD_EMOJIS[v - 1] ?? "😐";
      return (
        <span className="flex items-center gap-1.5">
          <span className="text-xl" role="img" aria-hidden="true">{emoji}</span>
          <span>{getMoodLabel(v, t)}</span>
        </span>
      );
    }
    case "multiple_choice": {
      if (answerJson && typeof answerJson === "object") {
        const selections = Array.isArray(answerJson) ? answerJson : [answerJson];
        return (
          <div className="flex flex-wrap gap-1">
            {selections.map((item, i) => (
              <Badge key={i} variant="secondary">
                {String(item)}
              </Badge>
            ))}
          </div>
        );
      }
      if (answerText) {
        return <Badge variant="secondary">{answerText}</Badge>;
      }
      return <span className="text-muted-foreground">{t("noAnswer")}</span>;
    }
    case "free_text":
    default: {
      if (!answerText) {
        return <span className="text-muted-foreground">{t("noAnswer")}</span>;
      }
      const isLong = answerText.length > 150;
      if (isLong) {
        return (
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              {answerText.slice(0, 150)}...
            </summary>
            <p className="mt-1 whitespace-pre-wrap">{answerText}</p>
          </details>
        );
      }
      return <p className="text-sm whitespace-pre-wrap">{answerText}</p>;
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic translation keys
function getMoodLabel(value: number, t: (key: any) => string): string {
  const keys: Record<number, string> = {
    1: "moodVeryLow",
    2: "moodLow",
    3: "moodNeutral",
    4: "moodGood",
    5: "moodGreat",
  };
  return keys[value] ? t(keys[value]) : String(value);
}

export function QuestionHistoryDialog({
  open,
  onOpenChange,
  questionId,
  questionText,
  answerType,
  previousSessions,
}: QuestionHistoryDialogProps) {
  const t = useTranslations("sessions.history");
  const format = useFormatter();

  const historyEntries = useMemo(() => {
    return previousSessions
      .map((session) => {
        const answer = session.answers.find((a) => a.questionId === questionId);
        if (!answer) return null;
        return {
          sessionNumber: session.sessionNumber,
          completedAt: session.completedAt,
          answerText: answer.answerText,
          answerNumeric: answer.answerNumeric,
          answerJson: answer.answerJson,
          answerType: answer.answerType,
        };
      })
      .filter(Boolean) as Array<{
      sessionNumber: number;
      completedAt: string;
      answerText: string | null;
      answerNumeric: string | null;
      answerJson: unknown;
      answerType: string;
    }>;
  }, [previousSessions, questionId]);

  const numericValues = useMemo(() => {
    if (
      answerType !== "rating_1_5" &&
      answerType !== "rating_1_10" &&
      answerType !== "mood"
    ) {
      return [];
    }
    return historyEntries
      .filter((e) => e.answerNumeric !== null)
      .map((e) => Number(e.answerNumeric));
  }, [historyEntries, answerType]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base leading-snug">{questionText}</DialogTitle>
          <DialogDescription>
            {t("answerHistory")}
          </DialogDescription>
        </DialogHeader>

        {historyEntries.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {t("noHistory")}
          </div>
        ) : (
          <div className="space-y-4">
            {numericValues.length >= 2 && (
              <div className="rounded-md border p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t("trend")}
                </p>
                <ScoreSparkline data={numericValues} height={48} />
              </div>
            )}

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {historyEntries.map((entry) => (
                <div
                  key={entry.sessionNumber}
                  className="flex items-start gap-3 rounded-md border p-3"
                >
                  <div className="flex flex-col items-center gap-0.5 shrink-0">
                    <span className="text-xs font-medium text-muted-foreground">
                      #{entry.sessionNumber}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {format.dateTime(new Date(entry.completedAt), { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    {formatAnswerValue(
                      entry.answerType,
                      entry.answerText,
                      entry.answerNumeric,
                      entry.answerJson,
                      t
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
