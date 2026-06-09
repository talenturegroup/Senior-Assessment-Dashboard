import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useGetSession, useGetSessionQuestions, useSubmitAnswer, useEvaluateSession, useGenerateSessionQuestions } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMediaStream } from "../hooks/use-media-stream";
import { Mic, SquareSquare, Send, Bot, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function Interview() {
  const [, setLocation] = useLocation();
  const { sessionId } = useParams<{ sessionId: string }>();
  const id = parseInt(sessionId!, 10);
  
  const { videoRef, error: cameraError } = useMediaStream();
  
  const { data: session } = useGetSession(id, { query: { enabled: !!id } });
  const { data: questions, isLoading: isLoadingQuestions } = useGetSessionQuestions(id, { query: { enabled: !!id && session?.questionsGenerated } });
  
  const generateQuestions = useGenerateSessionQuestions();
  const submitAnswer = useSubmitAnswer();
  const evaluateSession = useEvaluateSession();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);

  // Auto-generate questions if not generated yet
  useEffect(() => {
    if (session && !session.questionsGenerated && !generateQuestions.isPending) {
      generateQuestions.mutate({ id });
    }
  }, [session]);

  const currentQuestion = questions?.[currentIndex];
  const progress = questions?.length ? ((currentIndex) / questions.length) * 100 : 0;

  const handleNext = () => {
    if (!currentQuestion) return;
    
    submitAnswer.mutate(
      {
        id,
        data: {
          questionId: currentQuestion.id,
          transcript: transcript || "No answer provided."
        }
      },
      {
        onSuccess: () => {
          setTranscript("");
          setIsRecording(false);
          if (currentIndex < (questions?.length || 0) - 1) {
            setCurrentIndex(prev => prev + 1);
          } else {
            // Finish interview
            evaluateSession.mutate(
              { id },
              {
                onSuccess: () => {
                  setLocation(`/results/${id}`);
                }
              }
            );
          }
        }
      }
    );
  };

  if (!session || isLoadingQuestions || (session && !session.questionsGenerated)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center flex-col text-primary font-mono space-y-4">
        <Bot className="h-12 w-12 animate-pulse" />
        <p>CALIBRATING_ASSESSMENT_VECTORS...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col overflow-hidden">
      {/* Top Bar */}
      <header className="h-14 border-b border-border bg-card/80 backdrop-blur flex items-center justify-between px-6">
        <div className="flex items-center gap-2 text-primary font-mono text-sm">
          <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          LIVE_SESSION // {session.roleTitle.toUpperCase()}
        </div>
        <div className="font-mono text-sm text-muted-foreground">
          QUESTION {currentIndex + 1} OF {questions?.length}
        </div>
      </header>
      
      <Progress value={progress} className="h-1 rounded-none bg-secondary" />

      <main className="flex-1 flex flex-col md:flex-row gap-4 p-4 md:p-6 overflow-hidden">
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          
          <Card className="flex-1 border-primary/20 bg-card/40 flex flex-col overflow-hidden relative">
            <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,1)_50%)] bg-[length:100%_4px]" />
            <div className="p-8 flex-1 flex flex-col justify-center">
              <div className="text-primary font-mono text-xs mb-4 flex items-center gap-2">
                <Bot className="h-4 w-4" /> AI_INTERVIEWER
              </div>
              <h2 className="text-2xl md:text-3xl font-medium leading-relaxed">
                {currentQuestion?.questionText}
              </h2>
            </div>
          </Card>

          <Card className="h-48 border-border bg-card/40 flex flex-col overflow-hidden shrink-0">
            <div className="p-2 bg-secondary/50 border-b border-border flex items-center justify-between">
              <span className="font-mono text-xs text-muted-foreground flex items-center gap-2">
                <Mic className="h-3 w-3" /> TRANSCRIPT_INPUT
              </span>
              <Button 
                variant={isRecording ? "destructive" : "secondary"} 
                size="sm" 
                className="h-6 text-xs font-mono"
                onClick={() => setIsRecording(!isRecording)}
              >
                {isRecording ? <><SquareSquare className="h-3 w-3 mr-1" /> STOP</> : <><Mic className="h-3 w-3 mr-1" /> START</>}
              </Button>
            </div>
            <Textarea 
              className="flex-1 resize-none border-0 focus-visible:ring-0 rounded-none bg-transparent p-4 font-mono text-sm"
              placeholder="Simulated speech-to-text input... Type your answer here."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
            />
          </Card>

          <div className="flex justify-end">
            <Button 
              size="lg" 
              className="font-mono h-12 px-8 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]"
              onClick={handleNext}
              disabled={submitAnswer.isPending || evaluateSession.isPending}
            >
              {currentIndex === (questions?.length || 0) - 1 ? "FINALIZE_ASSESSMENT" : "SUBMIT_AND_PROCEED"}
              <Send className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Sidebar / Camera */}
        <div className="w-full md:w-80 flex flex-col gap-4">
          <Card className="aspect-[4/3] bg-black border-border overflow-hidden relative">
            {cameraError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground font-mono text-xs p-4 text-center border border-destructive">
                <AlertTriangle className="h-6 w-6 text-destructive mb-2" />
                CAMERA_FEED_ERROR: {cameraError}
              </div>
            ) : (
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover scale-x-[-1]"
              />
            )}
            <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur rounded text-[10px] font-mono border border-border">
              CANDIDATE_FEED
            </div>
            {isRecording && (
              <div className="absolute top-2 right-2 px-2 py-1 bg-destructive/20 text-destructive rounded text-[10px] font-mono border border-destructive animate-pulse">
                RECORDING
              </div>
            )}
          </Card>
          
          <Card className="flex-1 bg-card/40 border-border p-4">
            <h3 className="font-mono text-xs text-muted-foreground mb-4">SESSION_TELEMETRY</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span>AUDIO_LEVEL</span>
                  <span>{isRecording ? 'NORMAL' : 'STANDBY'}</span>
                </div>
                <Progress value={isRecording ? 65 + Math.random()*10 : 0} className="h-1" />
              </div>
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span>RESPONSE_LENGTH</span>
                  <span>{transcript.length} CHARS</span>
                </div>
                <Progress value={Math.min((transcript.length / 500) * 100, 100)} className="h-1" />
              </div>
            </div>
          </Card>
        </div>

      </main>
    </div>
  );
}
