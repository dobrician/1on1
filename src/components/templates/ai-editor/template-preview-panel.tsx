"use client";

import { useTranslations } from "next-intl";
import type { TemplateExport } from "@/lib/templates/export-schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface TemplatePreviewPanelProps {
  template: TemplateExport | null;
}

export function TemplatePreviewPanel({ template }: TemplatePreviewPanelProps) {
  const t = useTranslations("templates");

  if (template === null) {
    return (
      <div className="space-y-8 max-w-xl">
        <p className="text-sm text-muted-foreground">
          {t("aiEditor.preview.empty")}
        </p>

        <div className="space-y-6">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              {t("aiEditor.guidelines.title")}
            </h3>
            <div className="space-y-4">
              {(
                [
                  "length",
                  "specific",
                  "balance",
                  "helpText",
                  "safety",
                  "coverage",
                ] as const
              ).map((key) => (
                <div key={key} className="flex gap-3">
                  <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-muted-foreground shrink-0 translate-y-[6px]" />
                  <div>
                    <p className="text-sm font-medium">
                      {t(`aiEditor.guidelines.${key}.title`)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t(`aiEditor.guidelines.${key}.body`)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">{template.name}</h2>
          {template.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {template.description}
            </p>
          )}
        </div>

        {template.sections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-3">
            <h3 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
              {section.name}
            </h3>

            <div className="space-y-2">
              {section.questions.map((question, qIdx) => (
                <Card key={qIdx}>
                  <CardContent className="pt-3 pb-3 space-y-1">
                    <p className="text-sm font-medium">{question.questionText}</p>
                    <Badge variant="secondary" className="text-xs">
                      {t(
                        `aiEditor.preview.answerTypeLabel.${question.answerType}` as Parameters<typeof t>[0]
                      )}
                    </Badge>
                    {question.helpText && (
                      <p className="text-xs text-muted-foreground">
                        {question.helpText}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
