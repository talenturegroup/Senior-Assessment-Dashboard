import { useLocation, useParams } from "wouter";
import { useGetSession } from "@workspace/api-client-react";
import { Navbar } from "../components/navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowLeft } from "lucide-react";

export default function Results() {
  const [, setLocation] = useLocation();
  const { sessionId } = useParams<{ sessionId: string }>();
  const id = parseInt(sessionId!, 10);

  const { data: session } = useGetSession(id);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 container max-w-2xl mx-auto py-12 px-4 flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-8 duration-700">
        <Card className="w-full bg-card/60 backdrop-blur border-border">
          <CardContent className="pt-10 pb-10 flex flex-col items-center text-center space-y-6">
            <div className="p-4 rounded-full border border-primary/40 bg-primary/10">
              <CheckCircle2 className="h-12 w-12 text-primary" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">Assessment Submitted</h1>
              {session?.roleTitle && (
                <p className="font-mono text-xs text-muted-foreground">
                  {session.roleTitle.toUpperCase()}
                </p>
              )}
            </div>

            <p className="text-base leading-relaxed text-muted-foreground max-w-md">
              Thank you for completing your assessment. Your responses have been received and
              recorded. A member of the Arvencor team will review your submission and reach out
              to you with the next steps.
            </p>

            <p className="text-sm text-muted-foreground">
              You don't need to do anything else for now.
            </p>

            <Button
              variant="outline"
              className="font-mono text-xs mt-2"
              onClick={() => setLocation("/dashboard")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> RETURN_TO_DASHBOARD
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
