"use client";

import { Camera, Layers, LayoutDashboard, ScanEye } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { SystemStatusCard } from "@/components/shell/SystemStatusCard";
import { cn } from "@/lib/cn";

const NAV_SECTIONS = [
  {
    title: "Overview",
    items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Detection",
    items: [
      { href: "/camera", label: "Live Camera", icon: Camera },
      { href: "/batch", label: "Batch Processing", icon: Layers },
    ],
  },
] as const;

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-surface-1">
      <div className="flex items-center gap-3 border-b border-line px-4 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <ScanEye className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">
            OpenCV Detection
          </p>
          <p className="text-[11px] text-ink-faint">YOLOv8 dashboard</p>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
              {section.title}
            </p>
            <ul className="mt-1.5 space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition",
                        active
                          ? "bg-accent-soft font-medium text-accent"
                          : "text-ink-muted hover:bg-surface-2 hover:text-ink"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="space-y-3 border-t border-line px-3 py-4">
        <SystemStatusCard />
        <p className="px-1 text-[11px] text-ink-faint">
          Made by Jeremy Burke · Portfolio project
        </p>
      </div>
    </div>
  );
}
