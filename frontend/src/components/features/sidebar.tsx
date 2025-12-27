'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import {
  HomeIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowRightStartOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { signOut } from 'next-auth/react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Opportunities', href: '/opportunities', icon: MagnifyingGlassIcon },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon, disabled: true },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-lg">D</span>
          </div>
          <span className="font-semibold text-lg">Durgan Field Guide</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col px-4">
        <ul role="list" className="flex flex-1 flex-col gap-1">
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <li key={item.name}>
                <Link
                  href={item.disabled ? '#' : item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'group flex gap-x-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    item.disabled && 'opacity-50 cursor-not-allowed'
                  )}
                  style={
                    isActive
                      ? { backgroundColor: 'var(--primary)', color: 'white' }
                      : { color: 'var(--muted-foreground)' }
                  }
                >
                  <item.icon
                    className={cn('h-5 w-5 shrink-0', isActive ? 'text-white' : 'text-muted-foreground')}
                    style={isActive ? { color: 'white' } : { color: 'var(--muted-foreground)' }}
                    aria-hidden="true"
                  />
                  {item.name}
                  {item.disabled && (
                    <span
                      className="ml-auto text-xs px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}
                    >
                      Beta
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Sign out */}
        <div className="mt-auto pb-4">
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex w-full items-center gap-x-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            style={{ color: 'var(--muted-foreground)' }}
          >
            <ArrowRightStartOnRectangleIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </nav>
    </>
  );

  return (
    <>
      {/* Mobile menu button */}
      <div className="sticky top-0 z-40 flex items-center gap-x-6 border-b px-4 py-4 sm:px-6 lg:hidden"
        style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}>
        <button
          type="button"
          className="-m-2.5 p-2.5 text-muted-foreground lg:hidden"
          onClick={() => setMobileMenuOpen(true)}
        >
          <span className="sr-only">Open sidebar</span>
          <Bars3Icon className="h-6 w-6" aria-hidden="true" />
        </button>
        <div className="flex-1 text-sm font-semibold leading-6">Durgan Field Guide</div>
      </div>

      {/* Mobile sidebar */}
      {mobileMenuOpen && (
        <div className="relative z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/30"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-full max-w-xs overflow-y-auto"
            style={{ backgroundColor: 'var(--background)' }}>
            <div className="flex h-16 items-center justify-between px-6">
              <span className="font-semibold">Menu</span>
              <button
                type="button"
                className="-m-2.5 p-2.5"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="sr-only">Close sidebar</span>
                <XMarkIcon className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            <NavContent />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div
        className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col border-r"
        style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
      >
        <NavContent />
      </div>
    </>
  );
}
