"use client";

import {
  CalendarDaysIcon,
  Cog6ToothIcon,
  FolderIcon,
  PhotoIcon,
  RectangleGroupIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import ScrollArea from "./ScrollArea";

interface NavItem {
  href: string;
  label: string;
  icon: typeof RectangleGroupIcon;
}

const NAV: NavItem[] = [
  { href: "/", label: "Overview", icon: RectangleGroupIcon },
  { href: "/calendar", label: "Calendar", icon: CalendarDaysIcon },
  { href: "/library", label: "Content library", icon: PhotoIcon },
  { href: "/campaigns", label: "Campaigns", icon: FolderIcon },
  { href: "/settings", label: "Settings", icon: Cog6ToothIcon },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="dot" />
        Pinterest OS
      </div>
      <ScrollArea className="sidebar-nav" cueSize="tight">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link${active ? " active" : ""}`}
              onFocus={() => router.prefetch(item.href)}
              onPointerEnter={() => router.prefetch(item.href)}
            >
              <Icon className="icon" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </ScrollArea>
      <div className="nav-foot">v0.1 · manual studio</div>
    </aside>
  );
}
