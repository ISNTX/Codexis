import { SignInButton, SignOutButton, UserButton, useUser } from "@clerk/react";
import { Sparkles, CreditCard, LogIn, LogOut, LayoutDashboard, Loader2 } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import type { ConversationMode } from "@shared/schema";

interface HeaderProps {
  currentMode: ConversationMode;
  onModeChange: (mode: ConversationMode) => void;
}

export function Header({ currentMode, onModeChange }: HeaderProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();

  const modes: { value: ConversationMode; label: string }[] = [
    { value: "chat", label: "Chat" },
    { value: "compare", label: "Compare" },
    { value: "orchestrate", label: "Orchestrate" },
    { value: "agenic", label: "Agenic" },
    { value: "marketer", label: "Marketer" },
  ];

  const isPricingPage = location === "/pricing";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-6 gap-4">
        <Link href="/">
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Multi-AI Platform</h1>
          </div>
        </Link>

        {!isPricingPage && (
          <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
            {modes.map((mode) => (
              <Button
                key={mode.value}
                variant={currentMode === mode.value ? "secondary" : "ghost"}
                size="sm"
                onClick={() => onModeChange(mode.value)}
                data-testid={`button-mode-${mode.value}`}
                className="min-h-8"
              >
                {mode.label}
              </Button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Link href="/pricing">
            <Button
              variant={isPricingPage ? "secondary" : "ghost"}
              size="sm"
              data-testid="button-pricing"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Pricing
            </Button>
          </Link>

          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  data-testid="button-user-menu"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.profileImageUrl || undefined} />
                    <AvatarFallback>
                      {user.firstName?.[0] || user.email?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">
                    {user.firstName || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user.email}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="cursor-pointer">
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <SignOutButton><button className="cursor-pointer">Sign out</button></SignOutButton>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="default"
              size="sm"
              asChild
              data-testid="button-login"
            >
              <SignInButton mode="modal"><button>Sign in</button></SignInButton>
            </Button>
          )}

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
