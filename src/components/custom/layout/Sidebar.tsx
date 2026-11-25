import React, { type KeyboardEvent, type ComponentType } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  Camera,
  BarChart3,
  Settings,
  LogOut,
  CalendarDays,
  Users,
  Radio,
  Sparkles,
  type LucideProps,
} from "lucide-react";
import logoImage from "@/assets/smart-attend-logo.png";

interface MenuItem {
  id: string;
  to: string;
  icon: ComponentType<LucideProps>;
  label: string;
}

const menuItems: MenuItem[] = [
  {
    id: "dashboard",
    to: "/dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
  },
  { id: "attendance", to: "/attendance", icon: Camera, label: "Attendance" },
  { id: "history", to: "/history", icon: CalendarDays, label: "My History" },
  { id: "reports", to: "/reports", icon: BarChart3, label: "Reports" },
  { id: "assistant", to: "/assistant", icon: Sparkles, label: "AI Assistant" },
  { id: "profile", to: "/profile", icon: Settings, label: "Profile" },
];

// Only shown to signed-in admins (see role check below) — lets an admin
// actually reach /admin/employees and /admin/reports, which previously
// had no nav entry anywhere and were only reachable by typing the URL.
const adminMenuItems: MenuItem[] = [
  { id: "admin-employees", to: "/admin/employees", icon: Users, label: "Employees" },
  { id: "admin-reports", to: "/admin/reports", icon: Radio, label: "Live Monitor" },
];

const calligraphy = { fontFamily: "'Dancing Script', cursive" };

interface SidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ mobile, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const visibleMenuItems = isAdmin ? [...menuItems, ...adminMenuItems] : menuItems;

  const handleLogout = () => {
    navigate("/", { replace: true });
    logout();
  };

  // This is the actual fix: previously this only called an `onChange` prop
  // that AppLayout never passed in, so clicking a nav item did nothing.
  // Now it navigates via react-router directly.
  const handleItemClick = (to: string) => {
    if (to !== location.pathname) {
      navigate(to);
    }
    if (mobile && onClose) {
      onClose();
    }
  };

  const handleKeyDown = (e: KeyboardEvent, action: () => void) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      action();
    }
  };

  return (
    <>
      <style>{`
        @keyframes sidebarIn {
          from { opacity: 0; transform: translateX(-10px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .nav-item {
          position: relative;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .nav-item::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 0;
          background: #f5c27a;
          border-radius: 0 4px 4px 0;
          transition: height 0.25s ease;
        }
        .nav-item.active::before {
          height: 60%;
        }
      `}</style>

      {/* Removed 'hidden lg:flex' from base container so it renders properly inside the mobile drawer wrapper */}
      <aside
        className={`flex flex-col h-full bg-[#542117] border-r border-[#1f1f1f] ${
          mobile ? "w-full" : "w-64 hidden lg:flex h-screen sticky top-0"
        }`}
        style={{ animation: "sidebarIn 0.3s ease" }}
        aria-label="Navigation sidebar"
      >
        {/* ─── BRAND SECTION ─── */}
        <div className="p-6 flex items-center gap-3 border-b border-[#1f1f1f]">
          <div className="h-10 w-10 rounded-full overflow-hidden shrink-0 border border-[#f5c27a]/30">
            <img
              src={logoImage}
              alt="Logo"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="leading-none">
            <span
              className="text-xl tracking-wide block text-[#f1f1f1]"
              style={calligraphy}
            >
              Smart <span className="text-[#f5c27a]"> - Attend</span>
            </span>
          </div>
        </div>

        {/* ─── NAVIGATION ─── */}
        <nav
          className="flex-1 px-3 py-6 space-y-2 overflow-y-auto"
          aria-label="Main navigation"
        >
          {visibleMenuItems.map((item, i) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.to)}
                onKeyDown={(e) =>
                  handleKeyDown(e, () => handleItemClick(item.to))
                }
                aria-current={isActive ? "page" : undefined}
                aria-label={item.label}
                className={`
                  nav-item group w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left
                  ${
                    isActive
                      ? "bg-[#f5c27a]/10 text-[#f5c27a] border border-[#f5c27a]/25 active"
                      : "text-zinc-300 hover:bg-zinc-800/50 hover:text-zinc-100 border border-transparent"
                  }
                `}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <Icon
                  size={18}
                  strokeWidth={isActive ? 2.5 : 2}
                  className="transition-transform group-hover:scale-110 shrink-0"
                />
                <span
                  className="text-lg font-medium tracking-wide"
                  style={calligraphy}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* ─── LOGOUT SECTION ─── */}
        <div className="p-4 border-t border-[#1f1f1f]">
          <button
            onClick={handleLogout}
            onKeyDown={(e) => handleKeyDown(e, handleLogout)}
            aria-label="Logout"
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-zinc-300 hover:bg-red-500/10 hover:text-red-500 transition-all group"
          >
            <LogOut
              size={18}
              className="group-hover:-translate-x-1 transition-transform shrink-0"
            />
            <span className="text-lg font-medium" style={calligraphy}>
              Logout
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
