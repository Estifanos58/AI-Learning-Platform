'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/src/contexts/auth';
import { 
    BookOpen, 
    Search, 
    Bell, 
    Settings, 
    User, 
    LogOut,
    Menu,
    ChevronRight,
    Home
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useWorkspace } from '../workspace-context';
import { ThemeCustomizer } from '@/components/theme-customizer';

export function TopBar() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { toggleSidebar, sidebarOpen, setProfileOpen } = useWorkspace(); 

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <header className="h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 gap-4 sticky top-0 z-50">
      {/* Left: Logo and Sidebar Toggle */}
      <div className="flex items-center gap-3 min-w-0">
        <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden h-8 w-8"
            onClick={toggleSidebar}
        >
            <Menu className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-2 text-primary">
          <div className="bg-primary/10 p-1.5 rounded-lg border border-primary/20">
            <BookOpen className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-bold tracking-tight hidden sm:inline">NotebookLM</h1>
        </div>
        
        {/* Simple Breadcrumb (Mock) */}
        <div className="hidden md:flex items-center gap-1 text-sm text-muted-foreground ml-4 pl-4 border-l border-border h-6">
            <Home className="h-3.5 w-3.5" />
            <ChevronRight className="h-3 w-3 opacity-50" />
            <span className="font-medium text-foreground/80 truncate max-w-[150px]">My Project</span>
        </div>
      </div>

      {/* Center: Search (Optional, centered if space allows) */}
      <div className="flex-1 max-w-xl px-4 hidden md:block">
        <div className="relative group">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
                placeholder="Search files, contents, or ask AI..." 
                className="pl-9 h-9 bg-muted/40 border-muted-foreground/10 focus-visible:bg-background transition-all rounded-full text-sm shadow-none"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                <span className="text-xs">⌘</span>K
            </kbd>
        </div>
      </div>

      {/* Right: Actions & User Menu */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground relative">
            <Bell className="h-4.5 w-4.5" />
            <span className="absolute top-2 right-2.5 h-1.5 w-1.5 bg-primary rounded-full ring-2 ring-background" />
        </Button>

        {/* User Menu */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full ml-1 ring-offset-background outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                <Avatar className="h-8 w-8 border border-border">
                    <AvatarImage src={`https://api.dicebear.com/7.x/notionists/svg?seed=${user.username}`} alt={user.username} />
                    <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.username}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setProfileOpen(true)}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/app/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:text-red-500 focus:bg-red-50">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
