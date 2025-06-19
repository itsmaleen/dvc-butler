import { cn } from "@/lib/utils";
import { useLocation, Link } from "@tanstack/react-router";
import {
  CloudIcon,
  FolderIcon,
  GitBranchIcon,
  SettingsIcon,
  UserIcon,
} from "lucide-react";

interface SettingsNavProps {
  className?: string;
}

export default function SettingsNav({ className }: SettingsNavProps) {
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    {
      title: "General",
      href: "/settings",
      icon: <SettingsIcon className="h-4 w-4 mr-2" />,
    },
    {
      title: "Remote Storage",
      href: "/settings/remote-storage",
      icon: <CloudIcon className="h-4 w-4 mr-2" />,
    },
    {
      title: "Local Data",
      href: "/settings/local-data",
      icon: <FolderIcon className="h-4 w-4 mr-2" />,
    },
    {
      title: "Git Configuration",
      href: "/settings/git-config",
      icon: <GitBranchIcon className="h-4 w-4 mr-2" />,
    },
    {
      title: "User Profile",
      href: "/settings/profile",
      icon: <UserIcon className="h-4 w-4 mr-2" />,
    },
  ];

  return (
    <nav className={cn("space-y-1", className)}>
      {navItems.map((item) => (
        <Link
          key={item.href}
          to={item.href}
          className={cn(
            "flex items-center px-3 py-2 text-sm rounded-md transition-colors",
            currentPath === item.href
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted"
          )}
        >
          {item.icon}
          {item.title}
        </Link>
      ))}
    </nav>
  );
}
