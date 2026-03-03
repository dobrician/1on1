"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    label: "Overview",
    href: "/overview",
    icon: LayoutDashboard,
  },
  {
    label: "People",
    href: "/people",
    icon: Users,
    matchAlso: ["/teams"],
  },
  {
    label: "Settings",
    href: "/settings/company",
    icon: Settings,
    matchAlso: ["/settings"],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  function isActive(item: (typeof navItems)[number]) {
    if (pathname.startsWith(item.href)) return true;
    if (item.matchAlso) {
      return item.matchAlso.some((path) => pathname.startsWith(path));
    }
    return false;
  }

  return (
    <aside className="flex w-[220px] shrink-0 flex-col border-r bg-muted/30">
      <div className="flex h-14 items-center border-b px-5">
        <Link href="/overview" className="text-lg font-semibold tracking-tight">
          1on1
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
