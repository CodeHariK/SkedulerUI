import { mergeProps, For, type Component } from 'solid-js';
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
  ChevronDown,
  Activity
} from 'lucide-solid';
import { cn } from '../lib/utils';

interface NavigationHeaderProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export const NavigationHeader: Component<NavigationHeaderProps> = (rawProps) => {
  // 1. Safely apply defaults while maintaining SolidJS reactivity
  const props = mergeProps({ activeTab: 'Scheduler' }, rawProps);

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Scheduler', icon: Calendar },
    { name: 'Stress Test', icon: Activity },
    { name: 'Dispatcher', icon: Truck },
    { name: 'Accounts', icon: BookOpen },
    { name: 'Contacts', icon: Users },
    { name: 'Reports', icon: FileLineChart },
    { name: 'Pricing', icon: Receipt },
  ];

  return (
    <header class="w-full bg-white dark:bg-[#141414] border-b border-border h-[53px] flex items-center justify-between px-5 sticky top-0 z-50">
      {/* Left Section: Logo & Navigation */}
      <div class="flex items-center gap-10 h-full">
        {/* Skeduler Brand Logo */}
        <div class="flex items-center cursor-pointer select-none">
          <img src="/SkedulerUI/logo.svg" alt="Skeduler Logo" class="h-5 w-auto object-contain" />
        </div>

        {/* Navigation Items */}
        <nav class="flex items-center h-full">
          {/* 2. <For> is Solid's highly optimized array renderer */}
          <For each={navItems}>
            {(item) => {
              const Icon = item.icon;

              return (
                <button
                  onClick={() => props.onTabChange?.(item.name)}
                  // 3. Reactivity is maintained by reading props.activeTab directly inline
                  class={cn(
                    "flex items-center gap-2 px-3 h-[53px] border-b-2 border-transparent text-xs font-medium select-none transition-all",
                    props.activeTab === item.name
                      ? "border-primary text-primary"
                      : "text-text-secondary hover:text-text-primary hover:bg-muted/10"
                  )}
                >
                  <Icon class={cn("w-4 h-4", props.activeTab === item.name ? "text-primary" : "text-text-tertiary")} />
                  <span>{item.name}</span>
                </button>
              );
            }}
          </For>
        </nav>
      </div>

      {/* Right Section: Actions & Profile */}
      <div class="flex items-center gap-2">
        {/* Action Buttons */}
        <div class="flex items-center gap-1">
          <button class="p-2 text-text-secondary hover:text-text-primary hover:bg-muted/30 rounded-lg transition-colors">
            <Search class="w-4 h-4" />
          </button>
          <button class="p-2 text-text-secondary hover:text-text-primary hover:bg-muted/30 rounded-lg transition-colors">
            <MessageSquare class="w-4 h-4" />
          </button>
          <button class="p-2 text-text-secondary hover:text-text-primary hover:bg-muted/30 rounded-lg transition-colors">
            <HelpCircle class="w-4 h-4" />
          </button>
          <button class="p-2 text-text-secondary hover:text-text-primary hover:bg-muted/30 rounded-lg transition-colors relative">
            <Bell class="w-4 h-4" />
            <span class="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-[#2563eb] rounded-full" />
          </button>
        </div>

        {/* Vertical Divider */}
        <div class="h-6 w-px bg-border mx-1" />

        {/* User Profile Dropdown */}
        <div class="flex items-center gap-2 pl-2 py-1 pr-1 hover:bg-muted/30 rounded-lg cursor-pointer transition-colors select-none">
          {/* Avatar Image Placeholder/Style matching Figma */}
          <div class="w-8 h-8 rounded-full overflow-hidden bg-slate-200 border border-border flex items-center justify-center text-xs font-semibold text-text-secondary">
            {/* Standard fallback, or we can use custom styling */}
            <span class="text-[10px] text-text-primary font-bold">AW</span>
          </div>
          <span class="text-sm font-medium text-text-primary">Alan Wake</span>
          <ChevronDown class="w-4 h-4 text-text-tertiary" />
        </div>
      </div>
    </header>
  );
};
