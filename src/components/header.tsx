'use client';

import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogIn, LogOut, BookOpen } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { PLACEHOLDER_AVATAR } from '@/lib/placeholder-images';

export default function Header() {
  const { user, signIn, signOut } = useAuth();

  return (
    <header className="grid grid-cols-3 h-16 items-center border-b bg-card px-4 sm:px-6 shrink-0">
      {/* Left Section */}
      <div className="flex items-center gap-3 justify-start">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <Image src="/logo.png" alt="logo" width={32} height={32} />
          <h1 className="text-xl font-bold tracking-tight font-headline hidden sm:block">Mermaid Cloud Viz</h1>
        </Link>
      </div>

      {/* Center Section */}
      <div className="flex items-center justify-center">
        <Link href="/gallery">
          <Button variant="secondary" size="sm" className="gap-2 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 shadow-sm hover:shadow-md transition-shadow">
            <BookOpen className="h-4 w-4" />
            <span className="hidden md:inline">Diagram Gallery</span>
          </Button>
        </Link>
      </div>

      {/* Right Section */}
      <div className="flex items-center justify-end">
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10 border border-border">
                  <AvatarImage 
                    src={user.image || PLACEHOLDER_AVATAR} 
                    alt={user.name || 'User'} 
                  />
                  <AvatarFallback>
                    {user.name
                      ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
                      : 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button onClick={signIn}>
            <LogIn className="mr-2 h-4 w-4" />
            Login
          </Button>
        )}
      </div>
    </header>
  );
}
