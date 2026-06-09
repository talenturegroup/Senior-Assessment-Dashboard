import { Link, useLocation } from "wouter";
import { Show, useClerk } from "@clerk/react";
import { BrainCircuit, LogOut } from "lucide-react";
import { Button } from "./ui/button";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function Navbar() {
  const [, setLocation] = useLocation();
  const { signOut } = useClerk();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-primary">
          <BrainCircuit className="h-5 w-5" />
          <span>EVAL_CORE</span>
        </Link>
        <Show when="signed-in">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Dashboard
            </Link>
            <Link href="/profile" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Profile
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ redirectUrl: basePath || "/" })}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </Show>
        <Show when="signed-out">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="font-mono text-xs tracking-wider"
              onClick={() => setLocation("/sign-in")}
            >
              SIGN IN
            </Button>
            <Button
              size="sm"
              className="font-mono text-xs tracking-wider"
              onClick={() => setLocation("/sign-up")}
            >
              SIGN UP
            </Button>
          </div>
        </Show>
      </div>
    </nav>
  );
}
