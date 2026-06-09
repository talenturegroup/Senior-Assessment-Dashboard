import { useLocation, useParams } from "wouter";
import { useGetEvaluation, useGetSession, useListSessionAnswers, useGetSessionQuestions, getGetSessionQuestionsQueryKey } from "@workspace/api-client-react";
import { Navbar } from "../components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ShieldCheck, XCircle, AlertTriangle, ArrowLeft, ClipboardList, UserCheck } from "lucide-react";

const QUESTION_TYPE_LABEL: Record<string, string> = {
  technical: "TECHNICAL",
  system_design: "SYSTEM_DESIGN",
  behavioral: "BEHAVIORAL",
  coding: "CODING_CHALLENGE",
  soft_skill: "SOFT_SKILLS",
};

export default function Results() {
  const [, setLocation] = useLocation();
  const { sessionId } = useParams<{ sessionId: string }>();
  const id = parseInt(sessionId!, 10);

  const { data: session } = useGetSession(id);
  const { data: evaluation, isLoading } = useGetEvaluation(id);
  const { data: answers } = useListSessionAnswers(id);
  const { data: questions } = useGetSessionQuestions(id, {
    query: { enabled: !!id, queryKey: getGetSessionQuestionsQueryKey(id) },
  });

  if (isLoading || !evaluation) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center font-mono">
        <div className="w-16 h-16 border-t-2 border-primary border-solid rounded-full animate-spin mb-4"></div>
        GENERATING_EVALUATION_REPORT...
      </div>
    );
  }

  const getRatingDisplay = (rating: string) => {
    switch (rating) {
      case 'strong_hire': return { label: 'STRONG HIRE', color: 'bg-primary text-primary-foreground border-primary', icon: ShieldCheck };
      case 'hire': return { label: 'HIRE', color: 'bg-green-500/20 text-green-500 border-green-500', icon: ShieldCheck };
      case 'no_hire': return { label: 'NO HIRE', color: 'bg-destructive/20 text-destructive border-destructive', icon: XCircle };
      default: return { label: 'PENDING', color: 'bg-secondary text-secondary-foreground border-border', icon: AlertTriangle };
    }
  };

  const ratingObj = getRatingDisplay(evaluation.rating);
  const RatingIcon = ratingObj.icon;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 container max-w-5xl mx-auto py-8 px-4 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        <Button variant="ghost" className="font-mono text-xs" onClick={() => setLocation('/dashboard')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> RETURN_TO_DASHBOARD
        </Button>

        <div className="flex flex-col md:flex-row gap-8 items-start">
          
          {/* Main Score Card */}
          <Card className="w-full md:w-1/3 bg-card/60 backdrop-blur border-border shrink-0">
            <CardContent className="pt-6 pb-8 flex flex-col items-center text-center space-y-6">
              <div className={`p-4 rounded-full border ${ratingObj.color} bg-opacity-10`}>
                <RatingIcon className="h-12 w-12" />
              </div>
              
              <div>
                <h1 className="text-6xl font-black tracking-tighter mb-2 font-mono">
                  {evaluation.overallScore}
                </h1>
                <p className="text-sm font-mono text-muted-foreground">OVERALL_SCORE / 100</p>
              </div>

              <Badge className={`px-4 py-2 font-mono text-sm ${ratingObj.color}`}>
                {ratingObj.label}
              </Badge>

              <div className="w-full pt-6 border-t border-border space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-muted-foreground">TECHNICAL</span>
                    <span>{evaluation.technicalScore}</span>
                  </div>
                  <Progress value={evaluation.technicalScore} className="h-1.5" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-muted-foreground">COMMUNICATION</span>
                    <span>{evaluation.communicationScore}</span>
                  </div>
                  <Progress value={evaluation.communicationScore} className="h-1.5" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-muted-foreground">DOMAIN</span>
                    <span>{evaluation.domainScore}</span>
                  </div>
                  <Progress value={evaluation.domainScore} className="h-1.5" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Feedback */}
          <div className="flex-1 space-y-6 w-full">
            <Card className="bg-card/40 border-border">
              <CardHeader>
                <CardTitle className="font-mono text-lg flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  EVALUATION_SUMMARY
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {evaluation.summary || "Comprehensive analysis of candidate's technical aptitude and system design capabilities based on the interview transcript. Performance indicates strong alignment with expected seniority benchmarks."}
                </p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-green-500/5 border-green-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="font-mono text-sm text-green-500">IDENTIFIED_STRENGTHS</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{evaluation.strengths}</p>
                </CardContent>
              </Card>

              <Card className="bg-destructive/5 border-destructive/20">
                <CardHeader className="pb-3">
                  <CardTitle className="font-mono text-sm text-destructive">AREAS_FOR_IMPROVEMENT</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{evaluation.weaknesses}</p>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-card/40 border-border">
              <CardHeader className="pb-3">
                <CardTitle className="font-mono text-sm">DEVELOPMENT_SUGGESTIONS</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">{evaluation.suggestions}</p>
              </CardContent>
            </Card>
          </div>

        </div>

        {/* Candidate responses — saved for human evaluation */}
        <Card className="bg-card/40 border-border">
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-4 flex-wrap">
            <CardTitle className="font-mono text-sm flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              CANDIDATE_RESPONSES
            </CardTitle>
            <Badge
              variant="outline"
              className={`font-mono text-[10px] flex items-center gap-1 ${
                evaluation.humanReviewStatus === "reviewed"
                  ? "border-green-500/40 text-green-500"
                  : "border-amber-500/40 text-amber-500"
              }`}
            >
              <UserCheck className="h-3 w-3" />
              {evaluation.humanReviewStatus === "reviewed" ? "HUMAN_REVIEWED" : "PENDING_HUMAN_REVIEW"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              The AI scores above are provisional. Every response below is saved verbatim for a human
              reviewer to verify the assessment.
            </p>
            {answers && answers.length > 0 ? (
              answers.map((answer, i) => {
                const question = questions?.find((q) => q.id === answer.questionId);
                const blank = !answer.transcript.trim();
                return (
                  <div key={answer.id} className="rounded-md border border-border bg-background/40 p-4 space-y-2">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">Q{i + 1}</span>
                        {question && (
                          <Badge variant="outline" className="font-mono text-[10px] border-primary/30 text-primary">
                            {QUESTION_TYPE_LABEL[question.questionType] ?? question.questionType.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">
                        AI_SCORE: <span className="text-foreground">{answer.score}/100</span>
                      </span>
                    </div>
                    {question && (
                      <p className="text-sm font-medium leading-relaxed">{question.questionText}</p>
                    )}
                    <p className={`text-sm leading-relaxed font-mono whitespace-pre-wrap ${blank ? "italic text-destructive" : "text-muted-foreground"}`}>
                      {blank ? "— No answer provided —" : answer.transcript}
                    </p>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground italic">No responses were recorded for this session.</p>
            )}
          </CardContent>
        </Card>

      </main>
    </div>
  );
}
