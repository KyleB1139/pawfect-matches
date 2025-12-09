import { Dog, Heart, MessageCircle, User } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { useNotificationCounts } from "@/hooks/useNotificationCounts";

const NotificationBadge = ({ count }: { count: number }) => {
  if (count === 0) return null;
  return (
    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full px-1">
      {count > 99 ? '99+' : count}
    </span>
  );
};

const Navigation = () => {
  const { unreadMessages, newMatches } = useNotificationCounts();

  const navItems = [
    { icon: Dog, label: "Discover", path: "/discover", badge: 0 },
    { icon: Heart, label: "Matches", path: "/matches", badge: newMatches },
    { icon: MessageCircle, label: "Messages", path: "/messages", badge: unreadMessages },
    { icon: User, label: "Profile", path: "/profile", badge: 0 },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-card z-40">
      <div className="max-w-md mx-auto flex items-center justify-around py-2">
        {navItems.map(({ icon: Icon, label, path, badge }) => (
          <NavLink
            key={path}
            to={path}
            className="relative flex flex-col items-center gap-1 px-4 py-2 text-muted-foreground transition-colors"
            activeClassName="text-primary"
          >
            <div className="relative">
              <Icon className="w-6 h-6" />
              <NotificationBadge count={badge} />
            </div>
            <span className="text-xs font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default Navigation;
