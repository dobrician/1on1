"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { InviteDialog } from "@/components/people/invite-dialog";

export function InviteButton() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        <Plus className="mr-2 h-4 w-4" />
        Invite people
      </Button>
      <InviteDialog
        open={open}
        onOpenChange={setOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["users"] })}
      />
    </>
  );
}
