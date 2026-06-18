import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  Truck,
  BookOpen,
  Users,
  FileLineChart,
  Receipt,
  Search,
  MessageSquare,
  HelpCircle,
  Bell,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavigationHeaderProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  activeTab = 'Scheduler',
  onTabChange
}) => {
  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Scheduler', icon: Calendar },
    { name: 'Dispatcher', icon: Truck },
    { name: 'Accounts', icon: BookOpen },
    { name: 'Contacts', icon: Users },
    { name: 'Reports', icon: FileLineChart },
    { name: 'Pricing', icon: Receipt },
  ];

  return (
    <header className="w-full bg-white border-b border-border h-[53px] flex items-center justify-between px-5 sticky top-0 z-50">
      {/* Left Section: Logo & Navigation */}
      <div className="flex items-center gap-10 h-full">
        {/* Skeduler Brand Logo */}
        <div className="flex items-center cursor-pointer select-none">
          <img src="/SkedulerUI/logo.svg" alt="Skeduler Logo" className="h-5 w-auto object-contain" />
        </div>

        {/* Navigation Items */}
        <nav className="flex items-center h-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.name;

            return (
              <button
                key={item.name}
                onClick={() => onTabChange?.(item.name)}
                className={cn(
                  "flex items-center gap-2 px-3 h-[53px] border-b-2 border-transparent text-xs font-semibold select-none transition-all",
                  isActive
                    ? "border-primary text-primary"
                    : "text-text-secondary hover:text-text-primary hover:bg-muted/10"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-text-tertiary")} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Right Section: Actions & Profile */}
      <div className="flex items-center gap-2">
        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          <button className="p-2 text-text-secondary hover:text-text-primary hover:bg-muted/30 rounded-lg transition-colors">
            <Search className="w-4 h-4" />
          </button>
          <button className="p-2 text-text-secondary hover:text-text-primary hover:bg-muted/30 rounded-lg transition-colors">
            <MessageSquare className="w-4 h-4" />
          </button>
          <button className="p-2 text-text-secondary hover:text-text-primary hover:bg-muted/30 rounded-lg transition-colors">
            <HelpCircle className="w-4 h-4" />
          </button>
          <button className="p-2 text-text-secondary hover:text-text-primary hover:bg-muted/30 rounded-lg transition-colors relative">
            <Bell className="w-4 h-4" />
            <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-[#2563eb] rounded-full" />
          </button>
        </div>

        {/* Vertical Divider */}
        <div className="h-6 w-px bg-border mx-1" />

        {/* User Profile Dropdown */}
        <div className="flex items-center gap-2 pl-2 py-1 pr-1 hover:bg-muted/30 rounded-lg cursor-pointer transition-colors select-none">
          {/* Avatar Image Placeholder/Style matching Figma */}
          <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 border border-border flex items-center justify-center text-xs font-semibold text-text-secondary">
            {/* Standard fallback, or we can use custom styling */}
            <span className="text-[10px] text-text-primary font-bold">JD</span>
          </div>
          <span className="text-sm font-semibold text-text-primary">John Doe</span>
          <ChevronDown className="w-4 h-4 text-text-tertiary" />
        </div>
      </div>
    </header>
  );
};
