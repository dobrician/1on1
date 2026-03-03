import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LogoutButton } from "@/components/auth/logout-button";

export default async function OverviewPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const { user } = session;

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      {/* Email verification banner */}
      {!user.emailVerified && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-200">
          <p>
            Please verify your email address. Check your inbox for a
            verification link.
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            Welcome{user.name ? `, ${user.name}` : ""}
          </CardTitle>
          <CardDescription>
            Here is your account overview.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Role</span>
              <span className="capitalize">{user.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Organization</span>
              <span className="font-mono text-xs">{user.tenantId}</span>
            </div>
          </div>

          <div className="pt-4">
            <LogoutButton />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
