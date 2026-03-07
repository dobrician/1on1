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
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <p className="text-muted-foreground text-sm">
          {t("aiEditor.preview.empty")}
        </p>
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
