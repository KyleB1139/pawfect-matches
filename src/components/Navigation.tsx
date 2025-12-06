import { Dog, Heart, MessageCircle, User } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";

const Navigation = () => {
  const navItems = [
    { icon: Dog, label: "Discover", path: "/discover" },
    { icon: Heart, label: "Matches", path: "/matches" },
    { icon: MessageCircle, label: "Messages", path: "/messages" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-card z-40">
      <div className="max-w-md mx-auto flex items-center justify-around py-2">
        {navItems.map(({ icon: Icon, label, path }) => (
          <NavLink
            key={path}
            to={path}
            className="flex flex-col items-center gap-1 px-4 py-2 text-muted-foreground transition-colors"
            activeClassName="text-primary"
          >
            <Icon className="w-6 h-6" />
            <span className="text-xs font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default Navigation;
