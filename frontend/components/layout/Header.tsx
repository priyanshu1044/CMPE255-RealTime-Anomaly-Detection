"use client"
import { useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '../ui/badge';

export function Header() {
  const { setTheme } = useTheme();
  // Mock connection status - in a real app, you'd fetch this from your backend
  const [isKafkaConnected] = useState(true);
  const [isDbConnected] = useState(true);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
      <div className="flex flex-1 items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Status indicators */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center">
              <Badge variant={isKafkaConnected ? "default" : "destructive"} className="mr-2">
                Kafka
              </Badge>
              <span className={`h-2 w-2 rounded-full ${isKafkaConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            </div>
            <div className="flex items-center">
              <Badge variant={isDbConnected ? "default" : "destructive"} className="mr-2">
                <Database className="h-3 w-3 mr-1" />
                DB
              </Badge>
              <span className={`h-2 w-2 rounded-full ${isDbConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")}>
                Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                System
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}