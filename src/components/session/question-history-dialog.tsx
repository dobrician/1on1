"use client";

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScoreSparkline } from "./score-sparkline";

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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatAnswerValue(
  answerType: string,
  answerText: string | null,
  answerNumeric: string | null,
  answerJson: unknown
): React.ReactNode {
  switch (answerType) {
    case "yes_no": {
      const value = answerText?.toLowerCase();
      if (value === "yes") {
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Yes</Badge>;
      }
      if (value === "no") {
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">No</Badge>;
      }
      return <span className="text-muted-foreground">No answer</span>;
    }
    case "rating_1_5":
    case "rating_1_10":
    case "mood": {
      if (answerNumeric === null) {
        return <span className="text-muted-foreground">No answer</span>;
      }
      const label =
        answerType === "mood"
          ? getMoodLabel(Number(answerNumeric))
          : `${answerNumeric}/${answerType === "rating_1_10" ? "10" : "5"}`;
      return (
        <span className="font-medium tabular-nums">{label}</span>
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
      return <span className="text-muted-foreground">No answer</span>;
    }
    case "free_text":
    default: {
      if (!answerText) {
        return <span className="text-muted-foreground">No answer</span>;
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

function getMoodLabel(value: number): string {
  const labels: Record<number, string> = {
    1: "Very Low",
    2: "Low",
    3: "Neutral",
    4: "Good",
    5: "Great",
  };
  return labels[value] ?? String(value);
}

export function QuestionHistoryDialog({
  open,
  onOpenChange,
  questionId,
  questionText,
  answerType,
  previousSessions,
}: QuestionHistoryDialogProps) {
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
            Answer history across previous sessions
          </DialogDescription>
        </DialogHeader>

        {historyEntries.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            This question has not been answered in any previous session.
          </div>
        ) : (
          <div className="space-y-4">
            {numericValues.length >= 2 && (
              <div className="rounded-md border p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Trend
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
                      {formatDate(entry.completedAt)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    {formatAnswerValue(
                      entry.answerType,
                      entry.answerText,
                      entry.answerNumeric,
                      entry.answerJson
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
