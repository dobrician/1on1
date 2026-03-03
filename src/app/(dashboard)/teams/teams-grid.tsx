"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TeamCard } from "@/components/people/team-card";
import { TeamCreateDialog } from "@/components/people/team-create-dialog";

interface TeamData {
  id: string;
  name: string;
  description: string | null;
  managerId: string | null;
  managerName: string | null;
  managerAvatarUrl: string | null;
  memberCount: number;
  createdAt: string;
}

interface TeamsGridProps {
  initialTeams: TeamData[];
  users: { id: string; firstName: string; lastName: string }[];
  currentUserRole: string;
}

export function TeamsGrid({
  initialTeams,
  users,
  currentUserRole,
}: TeamsGridProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const canCreate = currentUserRole === "admin" || currentUserRole === "manager";

  const { data: teamsList, refetch } = useQuery<TeamData[]>({
    queryKey: ["teams"],
    queryFn: async () => {
      const res = await fetch("/api/teams");
      if (!res.ok) throw new Error("Failed to fetch teams");
      return res.json();
    },
    initialData: initialTeams,
  });

  return (
    <div className="space-y-4">
      {canCreate && (
        <div className="flex justify-end">
          <Button onClick={() => setCreateOpen(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Create Team
          </Button>
        </div>
      )}

      {teamsList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <Users className="h-10 w-10 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No teams yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first team to organize your people.
          </p>
          {canCreate && (
            <Button
              className="mt-4"
              size="sm"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Team
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teamsList.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      )}

      {canCreate && (
        <TeamCreateDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSuccess={() => refetch()}
          users={users}
        />
      )}
    </div>
  );
}
