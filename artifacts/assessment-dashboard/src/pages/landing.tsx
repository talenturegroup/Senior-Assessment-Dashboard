import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { BrainCircuit, ChevronRight, ShieldCheck, Terminal, Target } from "lucide-react";

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground overflow-hidden relative">
      {/* Abstract background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      
      <div className="z-10 container max-w-4xl mx-auto px-4 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-mono mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Terminal className="h-4 w-4" />
          <span>SYS.READY // SENIOR_ASSESSMENT_PROTOCOL</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-br from-white to-white/40 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-both">
          Precision Evaluation <br />
          <span className="text-primary">for Senior Talent.</span>
        </h1>
        
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 font-mono animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 fill-mode-both">
          Step into the evaluation center. Our AI-driven video interviewer conducts rigorous, dynamic technical assessments calibrated for professionals with 5+ years of experience.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500 fill-mode-both">
          <Button size="lg" className="h-12 px-8 font-mono text-base" onClick={() => setLocation('/register')}>
            INITIALIZE ASSESSMENT <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 text-left animate-in fade-in duration-1000 delay-700 fill-mode-both">
          <div className="p-6 rounded-lg border border-border bg-card/50 backdrop-blur">
            <BrainCircuit className="h-8 w-8 text-primary mb-4" />
            <h3 className="text-lg font-bold mb-2">Adaptive Questioning</h3>
            <p className="text-sm text-muted-foreground">The AI probes your limits, adjusting complexity in real-time based on your responses.</p>
          </div>
          <div className="p-6 rounded-lg border border-border bg-card/50 backdrop-blur">
            <Target className="h-8 w-8 text-primary mb-4" />
            <h3 className="text-lg font-bold mb-2">High-Stakes Fidelity</h3>
            <p className="text-sm text-muted-foreground">No multiple choice. Pure technical articulation, system design, and architectural reasoning.</p>
          </div>
          <div className="p-6 rounded-lg border border-border bg-card/50 backdrop-blur">
            <ShieldCheck className="h-8 w-8 text-primary mb-4" />
            <h3 className="text-lg font-bold mb-2">Objective Scoring</h3>
            <p className="text-sm text-muted-foreground">Unbiased calibration against senior industry standards across technical, communication, and domain axes.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
