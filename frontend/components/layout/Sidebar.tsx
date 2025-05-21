"use client"
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, BarChart3, AreaChart, Search, Download, Activity } from 'lucide-react';

// Navigation items
const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: <BarChart3 className="h-4 w-4" /> },
  { name: 'Analytics', path: '/analytics', icon: <AreaChart className="h-4 w-4" /> },
  { name: 'Realtime', path: '/realtime', icon: <Activity className="h-4 w-4" /> },
  { name: 'Export', path: '/export', icon: <Download className="h-4 w-4" /> }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Navigation */}
      <Sheet>
        <SheetTrigger asChild className="lg:hidden">
          <Button variant="outline" size="icon" className="h-10 w-10">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72">
          <div className="flex flex-col gap-4 mt-8">
            <div className="px-4 mb-2">
              <h2 className="text-lg font-semibold">Anomaly Detection</h2>
            </div>
            <nav className="grid gap-1 px-2">
              {navItems.map((item) => (
                <Link 
                  key={item.path} 
                  href={item.path}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800",
                    pathname === item.path ? "bg-zinc-100 dark:bg-zinc-800" : "transparent"
                  )}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              ))}
            </nav>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar Navigation */}
      <div className="hidden h-screen w-64 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 lg:flex">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="text-lg">Anomaly Detection</span>
          </Link>
        </div>
        <nav className="grid gap-1 p-4">
          {navItems.map((item) => (
            <Link 
              key={item.path} 
              href={item.path}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                pathname === item.path 
                  ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50" 
                  : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              )}
            >
              {item.icon}
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}