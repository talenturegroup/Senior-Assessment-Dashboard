import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useGetSession, useGetSessionQuestions, useSubmitAnswer, useEvaluateSession, useGenerateSessionQuestions, getGetSessionQuestionsQueryKey, getGetSessionQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentCandidate } from "../lib/use-candidate";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useMediaStream } from "../hooks/use-media-stream";
import { speak, cancelSpeech, speechSupported } from "../lib/speech";
import { Mic, SquareSquare, Send, Bot, AlertTriangle, Volume2, VolumeX, Play } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const QUESTION_TYPE_LABEL: Record<string, string> = {
  technical: "TECHNICAL",
  system_design: "SYSTEM_DESIGN",
  behavioral: "BEHAVIORAL",
  coding: "CODING_CHALLENGE",
  soft_skill: "SOFT_SKILLS",
};

export default function Interview() {
  const [, setLocation] = useLocation();
  const { sessionId } = useParams<{ sessionId: string }>();
  const id = parseInt(sessionId!, 10);

  const { videoRef, error: cameraError } = useMediaStream();
  const queryClient = useQueryClient();
  const { candidate } = useCurrentCandidate();

  const { data: session } = useGetSession(id);
  const { data: questions, isLoading: isLoadingQuestions } = useGetSessionQuestions(id, {
    query: { enabled: !!id && !!session?.questionsGenerated, queryKey: getGetSessionQuestionsQueryKey(id) },
  });

  const generateQuestions = useGenerateSessionQuestions();
  const submitAnswer = useSubmitAnswer();
  const evaluateSession = useEvaluateSession();

  const [stage, setStage] = useState<"intro" | "interview">("intro");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [muted, setMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Auto-generate questions if not generated yet
  useEffect(() => {
    if (session && !session.questionsGenerated && !generateQuestions.isPending) {
      generateQuestions.mutate(
        { id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getGetSessionQueryKey(id) });
            queryClient.invalidateQueries({ queryKey: getGetSessionQuestionsQueryKey(id) });
          },
        }
      );
    }
  }, [session]);

  const firstName = candidate?.name?.split(" ")[0] ?? "there";
  const roleTitle = session?.roleTitle ?? "this role";
  const questionCount = questions?.length ?? 0;
  const introText = `Hello ${firstName}, and welcome to your AI assessment for the ${roleTitle} position. I'm your AI interviewer. Over the next ${questionCount || "few"} questions, I'll explore your soft skills, technical depth, and a couple of coding challenges. Take your time, answer in your own words, and type your response in the transcript box below each question. Your answers are saved for human review as well. When you're ready, press Begin Interview and we'll start.`;

  // Speak the welcome message when we land on the intro stage with questions ready.
  useEffect(() => {
    if (stage !== "intro" || !questions?.length || muted) return;
    speak(introText, { onStart: () => setIsSpeaking(true), onEnd: () => setIsSpeaking(false) });
    return () => cancelSpeech();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, questions?.length]);

  const currentQuestion = questions?.[currentIndex];

  // Speak each question as it appears during the interview.
  useEffect(() => {
    if (stage !== "interview" || !currentQuestion || muted) return;
    speak(currentQuestion.questionText, {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
    });
    return () => cancelSpeech();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, currentIndex, currentQuestion?.id]);

  const progress = questions?.length ? currentIndex / questions.length * 100 : 0;

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      if (next) {
        cancelSpeech();
        setIsSpeaking(false);
      } else if (stage === "interview" && currentQuestion) {
        speak(currentQuestion.questionText, { onStart: () => setIsSpeaking(true), onEnd: () => setIsSpeaking(false) });
      } else if (stage === "intro") {
        speak(introText, { onStart: () => setIsSpeaking(true), onEnd: () => setIsSpeaking(false) });
      }
      return next;
    });
  };

  const replay = () => {
    if (muted) return;
    const text = stage === "intro" ? introText : currentQuestion?.questionText ?? "";
    speak(text, { onStart: () => setIsSpeaking(true), onEnd: () => setIsSpeaking(false) });
  };

  const beginInterview = () => {
    cancelSpeech();
    setIsSpeaking(false);
    setStage("interview");
  };

  const handleNext = () => {
    if (!currentQuestion) return;
    cancelSpeech();
    setIsSpeaking(false);

    submitAnswer.mutate(
      {
        id,
        data: {
          questionId: currentQuestion.id,
          // Send the genuine response (trimmed). Blank answers stay blank so the
          // server scores them 0 instead of rewarding a non-answer.
          transcript: transcript.trim(),
        },
      },
      {
        onSuccess: () => {
          setTranscript("");
          setIsRecording(false);
          if (currentIndex < (questions?.length || 0) - 1) {
            setCurrentIndex((prev) => prev + 1);
          } else {
            evaluateSession.mutate(
              { id },
              {
                onSuccess: () => {
                  setLocation(`/results/${id}`);
                },
              }
            );
          }
        },
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

  // Welcome / intro stage — the AI interviewer greets the candidate.
  if (stage === "intro") {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6">
        <Card className="relative max-w-2xl w-full border-primary/30 bg-card/50 backdrop-blur p-8 md:p-10 overflow-hidden">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/15 blur-[100px]" />
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3 text-primary font-mono text-sm">
              <div className={`h-10 w-10 rounded-full border border-primary/40 flex items-center justify-center ${isSpeaking ? "animate-pulse" : ""}`}>
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <div>AI_INTERVIEWER</div>
                <div className="text-[10px] text-muted-foreground">
                  {isSpeaking ? "SPEAKING…" : speechSupported() ? "READY" : "TEXT_MODE"}
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="font-mono text-xs" onClick={toggleMute}>
              {muted ? <><VolumeX className="h-4 w-4 mr-1" /> UNMUTE</> : <><Volume2 className="h-4 w-4 mr-1" /> MUTE</>}
            </Button>
          </div>

          <h1 className="text-2xl md:text-3xl font-medium leading-relaxed mb-4">
            Welcome, {firstName}.
          </h1>
          <p className="text-muted-foreground leading-relaxed mb-6">
            This is your AI-led assessment for the{" "}
            <span className="text-foreground font-medium">{session.roleTitle}</span> role. I'll ask you{" "}
            {questionCount} questions spanning <span className="text-primary">soft skills</span>,{" "}
            <span className="text-primary">technical depth</span>, and{" "}
            <span className="text-primary">coding challenges</span>. Answer in your own words in the box under
            each question — your responses are also saved for human review.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button
              size="lg"
              className="font-mono h-12 px-8 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]"
              onClick={beginInterview}
            >
              BEGIN_INTERVIEW <Play className="ml-2 h-4 w-4" />
            </Button>
            {!muted && speechSupported() && (
              <Button variant="secondary" size="lg" className="font-mono h-12" onClick={replay}>
                <Volume2 className="mr-2 h-4 w-4" /> REPLAY_INTRO
              </Button>
            )}
          </div>
        </Card>
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
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="font-mono text-xs h-7" onClick={toggleMute}>
            {muted ? <><VolumeX className="h-4 w-4 mr-1" /> MUTED</> : <><Volume2 className="h-4 w-4 mr-1" /> VOICE_ON</>}
          </Button>
          <div className="font-mono text-sm text-muted-foreground">
            QUESTION {currentIndex + 1} OF {questions?.length}
          </div>
        </div>
      </header>

      <Progress value={progress} className="h-1 rounded-none bg-secondary" />

      <main className="flex-1 flex flex-col md:flex-row gap-4 p-4 md:p-6 overflow-hidden">

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">

          <Card className="flex-1 border-primary/20 bg-card/40 flex flex-col overflow-hidden relative">
            <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,1)_50%)] bg-[length:100%_4px]" />
            <div className="p-8 flex-1 flex flex-col justify-center">
              <div className="text-primary font-mono text-xs mb-4 flex items-center gap-3">
                <span className="flex items-center gap-2">
                  <Bot className={`h-4 w-4 ${isSpeaking ? "animate-pulse" : ""}`} /> AI_INTERVIEWER
                </span>
                {currentQuestion && (
                  <Badge variant="outline" className="font-mono text-[10px] border-primary/30 text-primary">
                    {QUESTION_TYPE_LABEL[currentQuestion.questionType] ?? currentQuestion.questionType.toUpperCase()}
                  </Badge>
                )}
                {isSpeaking && <span className="text-[10px] text-muted-foreground">SPEAKING…</span>}
              </div>
              <h2 className="text-2xl md:text-3xl font-medium leading-relaxed">
                {currentQuestion?.questionText}
              </h2>
              {!muted && speechSupported() && (
                <button
                  onClick={replay}
                  className="mt-6 self-start text-xs font-mono text-muted-foreground hover:text-primary flex items-center gap-2 transition-colors"
                >
                  <Volume2 className="h-3 w-3" /> REPLAY_QUESTION
                </button>
              )}
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
              placeholder="Type your answer here..."
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
