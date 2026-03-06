"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { useMutation } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface NotesEditorProps {
  sessionId: string;
  category: string;
  initialSharedContent: string;
  initialPrivateContent: string;
  readOnly?: boolean;
  onSavingChange?: (saving: boolean) => void;
}

function EditorToolbar({
  editor,
  disabled,
  labels,
}: {
  editor: ReturnType<typeof useEditor> | null;
  disabled?: boolean;
  labels: { bold: string; italic: string; bulletList: string; orderedList: string; link: string; enterUrl: string };
}) {
  if (!editor) return null;

  const buttons = [
    {
      icon: Bold,
      action: () => editor.chain().focus().toggleBold().run(),
      active: editor.isActive("bold"),
      label: labels.bold,
    },
    {
      icon: Italic,
      action: () => editor.chain().focus().toggleItalic().run(),
      active: editor.isActive("italic"),
      label: labels.italic,
    },
    {
      icon: List,
      action: () => editor.chain().focus().toggleBulletList().run(),
      active: editor.isActive("bulletList"),
      label: labels.bulletList,
    },
    {
      icon: ListOrdered,
      action: () => editor.chain().focus().toggleOrderedList().run(),
      active: editor.isActive("orderedList"),
      label: labels.orderedList,
    },
    {
      icon: LinkIcon,
      action: () => {
        if (editor.isActive("link")) {
          editor.chain().focus().unsetLink().run();
        } else {
          const url = window.prompt(labels.enterUrl);
          if (url) {
            editor.chain().focus().setLink({ href: url }).run();
          }
        }
      },
      active: editor.isActive("link"),
      label: labels.link,
    },
  ];

  return (
    <div className="flex items-center gap-0.5 border-b px-1 py-1">
      {buttons.map(({ icon: Icon, action, active, label }) => (
        <Button
          key={label}
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "size-7",
            active && "bg-muted text-foreground"
          )}
          onClick={action}
          disabled={disabled}
          title={label}
        >
          <Icon className="size-3.5" />
        </Button>
      ))}
    </div>
  );
}

export function NotesEditor({
  sessionId,
  category,
  initialSharedContent,
  initialPrivateContent,
  readOnly,
  onSavingChange,
}: NotesEditorProps) {
  const t = useTranslations("sessions.wizard");
  const [activeTab, setActiveTab] = useState<string>("shared");
  const [sharedContent, setSharedContent] = useState(initialSharedContent);
  const [privateContent, setPrivateContent] = useState(initialPrivateContent);

  // Debounced values for auto-save
  const debouncedShared = useDebounce(sharedContent, 500);
  const debouncedPrivate = useDebounce(privateContent, 500);

  // Shared notes save mutation
  const saveShared = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/sessions/${sessionId}/notes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, content }),
      });
      if (!res.ok) throw new Error("Failed to save shared notes");
      return res.json();
    },
    onMutate: () => onSavingChange?.(true),
    onSettled: () => onSavingChange?.(false),
  });

  // Private notes save mutation
  const savePrivate = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/sessions/${sessionId}/notes/private`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, content }),
      });
      if (!res.ok) throw new Error("Failed to save private note");
      return res.json();
    },
    onMutate: () => onSavingChange?.(true),
    onSettled: () => onSavingChange?.(false),
  });

  // Auto-save debounced shared content
  const sharedInitRef = useState(false);
  useEffect(() => {
    if (!sharedInitRef[0]) {
      sharedInitRef[1](true);
      return;
    }
    if (debouncedShared !== initialSharedContent) {
      saveShared.mutate(debouncedShared);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedShared]);

  // Auto-save debounced private content
  const privateInitRef = useState(false);
  useEffect(() => {
    if (!privateInitRef[0]) {
      privateInitRef[1](true);
      return;
    }
    if (debouncedPrivate !== initialPrivateContent) {
      savePrivate.mutate(debouncedPrivate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedPrivate]);

  // Shared editor
  const sharedEditor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
    ],
    content: initialSharedContent,
    immediatelyRender: false,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      setSharedContent(editor.getHTML());
    },
  });

  // Private editor
  const privateEditor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
    ],
    content: initialPrivateContent,
    immediatelyRender: false,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      setPrivateContent(editor.getHTML());
    },
  });

  // Expose a flush method for beforeunload
  const flushSaves = useCallback(() => {
    if (sharedContent !== initialSharedContent) {
      navigator.sendBeacon(
        `/api/sessions/${sessionId}/notes`,
        new Blob(
          [JSON.stringify({ category, content: sharedContent })],
          { type: "application/json" }
        )
      );
    }
    if (privateContent !== initialPrivateContent) {
      navigator.sendBeacon(
        `/api/sessions/${sessionId}/notes/private`,
        new Blob(
          [JSON.stringify({ category, content: privateContent })],
          { type: "application/json" }
        )
      );
    }
  }, [sessionId, category, sharedContent, privateContent, initialSharedContent, initialPrivateContent]);

  // Register flush on visibilitychange
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        flushSaves();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [flushSaves]);

  const toolbarLabels = {
    bold: t("bold"),
    italic: t("italic"),
    bulletList: t("bulletList"),
    orderedList: t("orderedList"),
    link: t("link"),
    enterUrl: t("enterUrl"),
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="shared" className="flex-1">
          {t("sharedNotes")}
        </TabsTrigger>
        <TabsTrigger value="private" className="flex-1">
          <Lock className="mr-1.5 size-3" />
          {t("privateNotes")}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="shared">
        <div className="rounded-md border">
          <EditorToolbar editor={sharedEditor} disabled={readOnly} labels={toolbarLabels} />
          <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none p-3 min-h-[120px] [&_.tiptap]:outline-none [&_.tiptap]:min-h-[96px]">
            <EditorContent editor={sharedEditor} />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="private">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="size-3" />
            <span>{t("onlyYouCanSee")}</span>
          </div>
          <div className="rounded-md border border-amber-200/50 bg-amber-50/30 dark:border-amber-900/30 dark:bg-amber-950/20">
            <EditorToolbar editor={privateEditor} disabled={readOnly} labels={toolbarLabels} />
            <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none p-3 min-h-[120px] [&_.tiptap]:outline-none [&_.tiptap]:min-h-[96px]">
              <EditorContent editor={privateEditor} />
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
