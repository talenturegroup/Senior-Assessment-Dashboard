import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSignInCandidate } from "@workspace/api-client-react";
import { useCandidate } from "../lib/use-candidate";
import { LogIn, ArrowRight } from "lucide-react";

export default function SignIn() {
  const [, setLocation] = useLocation();
  const { setCandidateId } = useCandidate();
  const signIn = useSignInCandidate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }
    signIn.mutate(
      { data: { email: email.trim() } },
      {
        onSuccess: (candidate) => {
          setCandidateId(candidate.id);
          setLocation(candidate.profileComplete ? "/dashboard" : "/profile");
        },
        onError: () => {
          setError("No account found with this email. Please sign up first.");
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md border-primary/20 shadow-[0_0_50px_-12px_rgba(6,182,212,0.1)]">
        <CardHeader className="space-y-1 pb-8 border-b border-border mb-6">
          <div className="flex items-center gap-2 mb-2 text-primary">
            <LogIn className="h-5 w-5" />
            <span className="font-mono text-sm tracking-wider">CANDIDATE_SIGN_IN</span>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">Welcome back</CardTitle>
          <CardDescription className="text-muted-foreground">
            Enter the email you registered with to resume your assessments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Email
              </label>
              <Input
                type="email"
                placeholder="john@example.com"
                className="bg-secondary/50 font-mono"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-destructive font-mono">{error}</p>}

            <Button
              type="submit"
              className="w-full font-mono text-sm tracking-wider h-12"
              disabled={signIn.isPending}
            >
              {signIn.isPending ? "AUTHENTICATING..." : (
                <>SIGN IN <ArrowRight className="ml-2 h-4 w-4" /></>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground font-mono">
              No account?{" "}
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => setLocation("/register")}
              >
                Sign up
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
