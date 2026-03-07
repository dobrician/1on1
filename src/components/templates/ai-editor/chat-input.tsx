"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const t = useTranslations("templates");
  const [value, setValue] = useState("");

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="flex gap-2 items-end">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t("aiEditor.chat.placeholder")}
        disabled={disabled}
        rows={3}
        className="resize-none flex-1"
      />
      <Button
        size="sm"
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        className="shrink-0"
      >
        <Send className="h-4 w-4 mr-2" />
        {disabled ? t("aiEditor.chat.thinking") : t("aiEditor.chat.send")}
      </Button>
    </div>
  );
}
