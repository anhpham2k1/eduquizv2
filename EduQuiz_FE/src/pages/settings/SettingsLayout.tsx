import type { HTMLAttributes, ReactNode } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Shield, User } from "lucide-react";
import { cn } from "../../lib/utils";

const sidebarNavItems = [
  {
    title: "Profile",
    href: "/settings/account",
    icon: <User className="mr-2 h-4 w-4" />,
  },
  {
    title: "Security",
    href: "/settings/security",
    icon: <Shield className="mr-2 h-4 w-4" />,
  },
];

interface SidebarNavProps extends HTMLAttributes<HTMLElement> {
  items: Array<{
    href: string;
    title: string;
    icon: ReactNode;
  }>;
}

function SidebarNav({ className, items, ...props }: SidebarNavProps) {
  return (
    <nav className={cn("flex space-x-2 lg:flex-col lg:space-y-1 lg:space-x-0", className)} {...props}>
      {items.map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          className={({ isActive }) =>
            cn(
              "flex items-center justify-start rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
              isActive ? "bg-accent text-accent-foreground" : "transparent",
            )
          }
        >
          {item.icon}
          {item.title}
        </NavLink>
      ))}
    </nav>
  );
}

export default function SettingsLayout() {
  return (
    <div className="container mx-auto px-4 py-10">
      <div className="space-y-6 p-10 pb-16 md:block">
        <div className="space-y-0.5">
          <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">Manage your account settings and preferences.</p>
        </div>
        <div className="flex flex-col space-y-8 lg:flex-row lg:space-y-0 lg:space-x-12">
          <aside className="-mx-4 lg:w-1/5">
            <SidebarNav items={sidebarNavItems} />
          </aside>
          <div className="flex-1 lg:max-w-2xl">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
