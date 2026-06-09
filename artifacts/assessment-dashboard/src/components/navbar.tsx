import { Link } from "wouter";
import { useCandidate } from "../lib/use-candidate";
import { BrainCircuit, LogOut } from "lucide-react";
import { Button } from "./ui/button";

export function Navbar() {
  const { candidateId, setCandidateId } = useCandidate();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-primary">
          <BrainCircuit className="h-5 w-5" />
          <span>EVAL_CORE</span>
        </Link>
        {candidateId && (
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
              onClick={() => {
                setCandidateId(null);
                window.location.href = "/";
              }}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Exit
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
}
