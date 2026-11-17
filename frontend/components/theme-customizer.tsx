'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useTheme } from 'next-themes';
import { useThemeColor, themeColors } from '@/src/contexts/theme-color-context';
import { cn } from '@/lib/utils';
import { Check, Info, Laptop, Moon, Palette, Sun } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export function ThemeCustomizer() {
  const { theme, setTheme } = useTheme();
  const { themeColor, setThemeColor } = useThemeColor();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9" title="Theme Settings">
          <Palette className="h-[1.2rem] w-[1.2rem] text-muted-foreground hover:text-foreground transition-all" />
          <span className="sr-only">Customize theme</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4 mr-4" align="end">
        <div className="space-y-4">
          <div className="font-semibold leading-none tracking-tight">Theme Preferences</div>
          
          <div className="grid grid-cols-3 gap-2">
            <Button
                variant={"outline"}
                size="sm"
                onClick={() => setTheme('light')}
                className={cn(theme === 'light' && "border-primary bg-accent")}
            >
                <Sun className="h-4 w-4 mr-2" />
                Light
            </Button>
            <Button
                variant={"outline"}
                size="sm"
                onClick={() => setTheme('dark')}
                className={cn(theme === 'dark' && "border-primary bg-accent")}
            >
                <Moon className="h-4 w-4 mr-2" />
                Dark
            </Button>
            <Button
                variant={"outline"}
                size="sm"
                onClick={() => setTheme('system')}
                className={cn(theme === 'system' && "border-primary bg-accent")}
            >
                <Laptop className="h-4 w-4 mr-2" />
                System
            </Button>
          </div>

          <Separator />
          
          <div className="space-y-1.5 ">
            <div className="font-semibold leading-none tracking-tight text-xs text-muted-foreground">Color Scheme</div>
            <div className="grid grid-cols-3 gap-2 pt-2">
                {themeColors.map((color) => (
                    <Button
                        key={color.name}
                        variant={"outline"}
                        size="sm"
                        onClick={() => setThemeColor(color.name)}
                        className={cn(
                            "justify-start h-8 px-2 font-normal text-xs", 
                            themeColor === color.name && "border-primary bg-accent font-medium shadow-sm transition-all"
                        )}
                    >
                        <span className={cn("h-3 w-3 rounded-full mr-2 shrink-0 border border-muted-foreground/20", color.class)}></span>
                        {color.label}
                    </Button>
                ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
