"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslations } from "next-intl";
import { GripVertical, Pencil, Trash2, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { QuestionData } from "./template-editor";

interface QuestionCardProps {
  question: QuestionData;
  index: number;
  isReadOnly: boolean;
  allQuestions?: QuestionData[];
  onEdit: () => void;
  onRemove: () => void;
}

export function QuestionCard({
  question,
  index,
  isReadOnly,
  allQuestions,
  onEdit,
  onRemove,
}: QuestionCardProps) {
  const t = useTranslations("templates");
  const sortableId = question.id ?? `new-${index}`;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortableId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const answerTypeKey: Record<string, string> = {
    text: "editor.answerTypeText",
    rating_1_5: "editor.answerTypeRating5",
    rating_1_10: "editor.answerTypeRating10",
    yes_no: "editor.answerTypeYesNo",
    multiple_choice: "editor.answerTypeMultipleChoice",
    mood: "editor.answerTypeMood",
  };

  const operatorKey: Record<string, string> = {
    eq: "conditionalLogic.operatorEq",
    neq: "conditionalLogic.operatorNeq",
    lt: "conditionalLogic.operatorLt",
    gt: "conditionalLogic.operatorGt",
    lte: "conditionalLogic.operatorLte",
    gte: "conditionalLogic.operatorGte",
  };

  // Find the referenced question for the conditional indicator
  const conditionTarget = question.conditionalOnQuestionId && allQuestions
    ? allQuestions.find((q) => q.id === question.conditionalOnQuestionId)
    : null;
  const conditionTargetIndex = conditionTarget && allQuestions
    ? allQuestions.indexOf(conditionTarget) + 1
    : null;

  const answerTypeLabel = answerTypeKey[question.answerType]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? t(answerTypeKey[question.answerType] as any)
    : question.answerType;

  const operatorLabel = question.conditionalOperator
    ? (operatorKey[question.conditionalOperator]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? t(operatorKey[question.conditionalOperator] as any)
      : question.conditionalOperator)
    : "";

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        className={
          isDragging
            ? "opacity-50 shadow-lg ring-2 ring-primary/20"
            : "transition-shadow"
        }
      >
        <CardContent className="flex items-start gap-3 py-4">
          {/* Drag handle */}
          {!isReadOnly && (
            <button
              type="button"
              className="mt-1 flex h-8 w-6 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground hover:text-foreground active:cursor-grabbing"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
              <span className="sr-only">{t("questionCard.dragToReorder")}</span>
            </button>
          )}

          {/* Sort order number */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
            {index + 1}
          </div>

          {/* Question content */}
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium leading-snug">
                  {question.questionText}
                  {question.isRequired && (
                    <span className="ml-1 text-destructive">*</span>
                  )}
                </p>
                {question.helpText && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {question.helpText}
                  </p>
                )}
              </div>

              {/* Actions */}
              {!isReadOnly && (
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={onEdit}
                  >
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">{t("questionCard.editQuestion")}</span>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">{t("questionCard.removeQuestion")}</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("questionCard.removeTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t("questionCard.removeDesc")}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("questionCard.cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={onRemove}>
                          {t("questionCard.remove")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {answerTypeLabel}
              </Badge>
              {question.conditionalOnQuestionId && (
                <Badge
                  variant="outline"
                  className="text-xs border-amber-300 text-amber-700 dark:text-amber-400"
                >
                  <GitBranch className="mr-1 h-3 w-3" />
                  {t("questionCard.conditional")}
                </Badge>
              )}
            </div>

            {/* Conditional logic indicator */}
            {question.conditionalOnQuestionId && conditionTargetIndex && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <GitBranch className="h-3 w-3 shrink-0" />
                {t("questionCard.showsWhen", {
                  index: conditionTargetIndex,
                  operator: operatorLabel,
                  value: question.conditionalValue ?? "",
                })}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
