import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListAdminSessions,
  useGetAdminSessionDetail,
  useSetAdminReviewStatus,
  useDeleteAdminCandidate,
  getGetAdminSessionDetailQueryKey,
  getListAdminSessionsQueryKey,
} from "@workspace/api-client-react";
import type { AdminSessionDetail } from "@workspace/api-client-react";
import { Navbar } from "../components/navbar";
import { useIsAdmin } from "../lib/use-admin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ShieldAlert,
  ShieldCheck,
  XCircle,
  AlertTriangle,
  Users,
  ClipboardList,
  UserCheck,
  Clock,
  FileText,
  Download,
  Trash2,
} from "lucide-react";

const QUESTION_TYPE_LABEL: Record<string, string> = {
  technical: "TECHNICAL",
  system_design: "SYSTEM_DESIGN",
  behavioral: "BEHAVIORAL",
  coding: "CODING_CHALLENGE",
  soft_skill: "SOFT_SKILLS",
};

function ratingDisplay(rating: string | null) {
  switch (rating) {
    case "strong_hire":
      return { label: "STRONG HIRE", color: "bg-primary/20 text-primary border-primary/40", icon: ShieldCheck };
    case "hire":
      return { label: "HIRE", color: "bg-green-500/20 text-green-500 border-green-500/40", icon: ShieldCheck };
    case "no_hire":
      return { label: "NO HIRE", color: "bg-destructive/20 text-destructive border-destructive/40", icon: XCircle };
    default:
      return { label: "PENDING", color: "bg-secondary text-muted-foreground border-border", icon: AlertTriangle };
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "candidate";
}

function downloadTextFile(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildAssessmentCopy(data: AdminSessionDetail): string {
  const { candidate, session, questions, answers, evaluation } = data;
  const lines: string[] = [];
  lines.push("ASSESSMENT RECORD");
  lines.push("=================");
  lines.push(`Candidate: ${candidate.name} <${candidate.email}>`);
  lines.push(`Role: ${session.roleTitle}`);
  lines.push(`Status: ${session.status}`);
  lines.push(`Date: ${formatDate(session.createdAt)}`);
  lines.push("");

  if (evaluation) {
    lines.push("EVALUATION");
    lines.push("----------");
    lines.push(`Overall: ${evaluation.overallScore}/100  (${evaluation.rating})`);
    lines.push(`Technical: ${evaluation.technicalScore}  Communication: ${evaluation.communicationScore}  Domain: ${evaluation.domainScore}`);
    lines.push(`Human review: ${evaluation.humanReviewStatus}`);
    if (evaluation.summary) lines.push(`Summary: ${evaluation.summary}`);
    if (evaluation.strengths) lines.push(`Strengths: ${evaluation.strengths}`);
    if (evaluation.weaknesses) lines.push(`Weaknesses: ${evaluation.weaknesses}`);
    if (evaluation.suggestions) lines.push(`Suggestions: ${evaluation.suggestions}`);
    lines.push("");
  }

  lines.push("RESPONSES");
  lines.push("---------");
  answers.forEach((answer, i) => {
    const q = questions.find((qq) => qq.id === answer.questionId);
    lines.push(`Q${i + 1} [${q?.questionType ?? "unknown"}] (AI score: ${answer.score}/100)`);
    if (q) lines.push(q.questionText);
    lines.push(answer.transcript.trim() ? answer.transcript : "— No answer provided —");
    lines.push("");
  });

  return lines.join("\n");
}

function buildCvCopy(candidate: AdminSessionDetail["candidate"]): string {
  if (candidate.cvText && candidate.cvText.trim()) return candidate.cvText;
  const parsed = candidate.cvParsed;
  if (!parsed) return "";
  const lines: string[] = [];
  if (parsed.summary) {
    lines.push("SUMMARY");
    lines.push(parsed.summary);
    lines.push("");
  }
  parsed.sections.forEach((s) => {
    lines.push(s.heading.toUpperCase());
    lines.push(s.content);
    lines.push("");
  });
  return lines.join("\n");
}

function AdminSessionDetailDialog({
  sessionId,
  onClose,
}: {
  sessionId: number;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useGetAdminSessionDetail(sessionId, {
    query: { enabled: !!sessionId, queryKey: getGetAdminSessionDetailQueryKey(sessionId) },
  });

  const reviewMutation = useSetAdminReviewStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAdminSessionDetailQueryKey(sessionId) });
        queryClient.invalidateQueries({ queryKey: getListAdminSessionsQueryKey() });
        toast({ title: "Review status updated" });
      },
      onError: () => {
        toast({ title: "Failed to update review status", variant: "destructive" });
      },
    },
  });

  const deleteMutation = useDeleteAdminCandidate({
    mutation: {
      onSuccess: (result) => {
        queryClient.invalidateQueries({ queryKey: getListAdminSessionsQueryKey() });
        toast({
          title: "Candidate deleted",
          description: `Removed candidate and ${result.deletedSessions} session(s).`,
        });
        onClose();
      },
      onError: () => {
        toast({ title: "Failed to delete candidate", variant: "destructive" });
      },
    },
  });

  const evaluation = data?.evaluation ?? null;
  const reviewed = evaluation?.humanReviewStatus === "reviewed";
  const cvCopy = data ? buildCvCopy(data.candidate) : "";
  const hasCv = !!cvCopy.trim();

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono text-base">
            {data ? `${data.candidate.name} — ${data.session.roleTitle}` : "Loading…"}
          </DialogTitle>
        </DialogHeader>

        {isLoading || !data ? (
          <div className="py-12 text-center font-mono text-sm text-muted-foreground">
            LOADING_SESSION_DETAIL…
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-muted-foreground">
              <span>{data.candidate.email}</span>
              <span>•</span>
              <span>STATUS: {data.session.status.toUpperCase()}</span>
              <span>•</span>
              <span>{formatDate(data.session.createdAt)}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="font-mono text-xs"
                onClick={() =>
                  downloadTextFile(
                    `${slugify(data.candidate.name)}-${slugify(data.session.roleTitle)}-assessment.txt`,
                    buildAssessmentCopy(data),
                  )
                }
              >
                <Download className="h-4 w-4 mr-1" />
                ASSESSMENT_COPY
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="font-mono text-xs"
                disabled={!hasCv}
                onClick={() => downloadTextFile(`${slugify(data.candidate.name)}-cv.txt`, cvCopy)}
              >
                <Download className="h-4 w-4 mr-1" />
                CV_COPY
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="font-mono text-xs ml-auto"
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    DELETE_CANDIDATE
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this candidate?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently removes <span className="font-medium">{data.candidate.name}</span> and
                      every assessment session, response, and evaluation tied to them. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="font-mono text-xs">CANCEL</AlertDialogCancel>
                    <AlertDialogAction
                      className="font-mono text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => deleteMutation.mutate({ id: data.candidate.id })}
                    >
                      DELETE
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <Card className="bg-card/40 border-border">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="font-mono text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    CV_ON_FILE
                  </h3>
                  {data.candidate.cvFileName && (
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {data.candidate.cvFileName}
                    </span>
                  )}
                </div>
                {hasCv ? (
                  <pre className="text-xs leading-relaxed font-mono whitespace-pre-wrap text-muted-foreground max-h-64 overflow-y-auto border-t border-border pt-3">
                    {cvCopy}
                  </pre>
                ) : (
                  <p className="text-sm font-mono text-muted-foreground italic">
                    No CV has been uploaded by this candidate.
                  </p>
                )}
              </CardContent>
            </Card>

            {evaluation ? (
              <Card className="bg-card/40 border-border">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-baseline gap-3">
                      <span className="text-4xl font-black font-mono tracking-tighter">
                        {evaluation.overallScore}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">/ 100</span>
                    </div>
                    {(() => {
                      const r = ratingDisplay(evaluation.rating);
                      return (
                        <Badge className={`font-mono text-xs ${r.color}`}>{r.label}</Badge>
                      );
                    })()}
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs font-mono">
                    <div>
                      <p className="text-muted-foreground">TECHNICAL</p>
                      <p className="text-lg">{evaluation.technicalScore}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">COMMUNICATION</p>
                      <p className="text-lg">{evaluation.communicationScore}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">DOMAIN</p>
                      <p className="text-lg">{evaluation.domainScore}</p>
                    </div>
                  </div>
                  {evaluation.summary && (
                    <p className="text-sm leading-relaxed text-muted-foreground border-t border-border pt-3">
                      {evaluation.summary}
                    </p>
                  )}
                  {(evaluation.strengths || evaluation.weaknesses) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-border pt-3">
                      {evaluation.strengths && (
                        <div>
                          <p className="font-mono text-[10px] text-green-500 mb-1">STRENGTHS</p>
                          <p className="text-sm leading-relaxed text-muted-foreground">
                            {evaluation.strengths}
                          </p>
                        </div>
                      )}
                      {evaluation.weaknesses && (
                        <div>
                          <p className="font-mono text-[10px] text-destructive mb-1">AREAS_FOR_IMPROVEMENT</p>
                          <p className="text-sm leading-relaxed text-muted-foreground">
                            {evaluation.weaknesses}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  {evaluation.suggestions && (
                    <div className="border-t border-border pt-3">
                      <p className="font-mono text-[10px] text-muted-foreground mb-1">DEVELOPMENT_SUGGESTIONS</p>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {evaluation.suggestions}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3 flex-wrap border-t border-border pt-3">
                    <Badge
                      variant="outline"
                      className={`font-mono text-[10px] flex items-center gap-1 ${
                        reviewed
                          ? "border-green-500/40 text-green-500"
                          : "border-amber-500/40 text-amber-500"
                      }`}
                    >
                      <UserCheck className="h-3 w-3" />
                      {reviewed ? "HUMAN_REVIEWED" : "PENDING_HUMAN_REVIEW"}
                    </Badge>
                    <Button
                      size="sm"
                      variant={reviewed ? "outline" : "default"}
                      className="font-mono text-xs"
                      disabled={reviewMutation.isPending}
                      onClick={() =>
                        reviewMutation.mutate({
                          id: sessionId,
                          data: { humanReviewStatus: reviewed ? "pending" : "reviewed" },
                        })
                      }
                    >
                      {reviewed ? "MARK_AS_PENDING" : "MARK_AS_REVIEWED"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <p className="text-sm font-mono text-muted-foreground italic">
                No AI evaluation has been generated for this session yet.
              </p>
            )}

            <div className="space-y-3">
              <h3 className="font-mono text-sm flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                CANDIDATE_RESPONSES
              </h3>
              {data.answers.length > 0 ? (
                data.answers.map((answer, i) => {
                  const question = data.questions.find((q) => q.id === answer.questionId);
                  const blank = !answer.transcript.trim();
                  return (
                    <div
                      key={answer.id}
                      className="rounded-md border border-border bg-background/40 p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">Q{i + 1}</span>
                          {question && (
                            <Badge
                              variant="outline"
                              className="font-mono text-[10px] border-primary/30 text-primary"
                            >
                              {QUESTION_TYPE_LABEL[question.questionType] ??
                                question.questionType.toUpperCase()}
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
                      <p
                        className={`text-sm leading-relaxed font-mono whitespace-pre-wrap ${
                          blank ? "italic text-destructive" : "text-muted-foreground"
                        }`}
                      >
                        {blank ? "— No answer provided —" : answer.transcript}
                      </p>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No responses were recorded for this session.
                </p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function Admin() {
  const [, setLocation] = useLocation();
  const { isAdmin, authLoaded, isLoading: accessLoading } = useIsAdmin();
  const { data: sessions, isLoading: sessionsLoading } = useListAdminSessions({
    query: { enabled: isAdmin, queryKey: getListAdminSessionsQueryKey() },
  });
  const [selectedId, setSelectedId] = useState<number | null>(null);

  if (!authLoaded || accessLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center font-mono text-sm text-muted-foreground">
        <div className="w-12 h-12 border-t-2 border-primary border-solid rounded-full animate-spin mb-4" />
        VERIFYING_ACCESS…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center text-center px-4 gap-4">
          <ShieldAlert className="h-12 w-12 text-destructive" />
          <h1 className="font-mono text-lg">ACCESS_DENIED</h1>
          <p className="text-sm text-muted-foreground max-w-md">
            This recruiter area is restricted to authorized reviewers.
          </p>
          <Button variant="outline" className="font-mono text-xs" onClick={() => setLocation("/dashboard")}>
            RETURN_TO_DASHBOARD
          </Button>
        </main>
      </div>
    );
  }

  const list = sessions ?? [];
  const pendingReview = list.filter(
    (s) => s.overallScore !== null && s.humanReviewStatus !== "reviewed",
  ).length;
  const uniqueCandidates = new Set(list.map((s) => s.candidateId)).size;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container max-w-6xl mx-auto py-8 px-4 space-y-6 animate-in fade-in duration-500">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Recruiter Review
          </h1>
          <p className="text-sm text-muted-foreground">
            Every candidate's responses and scores in one place. AI scores are provisional — confirm
            each with a human review.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="bg-card/40 border-border">
            <CardContent className="pt-6">
              <p className="font-mono text-xs text-muted-foreground">TOTAL_SESSIONS</p>
              <p className="text-3xl font-black font-mono">{list.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-card/40 border-border">
            <CardContent className="pt-6">
              <p className="font-mono text-xs text-muted-foreground">CANDIDATES</p>
              <p className="text-3xl font-black font-mono">{uniqueCandidates}</p>
            </CardContent>
          </Card>
          <Card className="bg-card/40 border-border">
            <CardContent className="pt-6">
              <p className="font-mono text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> AWAITING_REVIEW
              </p>
              <p className="text-3xl font-black font-mono text-amber-500">{pendingReview}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card/40 border-border">
          <CardContent className="p-0">
            {sessionsLoading ? (
              <div className="py-16 text-center font-mono text-sm text-muted-foreground">
                LOADING_SESSIONS…
              </div>
            ) : list.length === 0 ? (
              <div className="py-16 text-center font-mono text-sm text-muted-foreground">
                No assessment sessions yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-mono text-xs">CANDIDATE</TableHead>
                    <TableHead className="font-mono text-xs">ROLE</TableHead>
                    <TableHead className="font-mono text-xs">STATUS</TableHead>
                    <TableHead className="font-mono text-xs text-right">SCORE</TableHead>
                    <TableHead className="font-mono text-xs">RATING</TableHead>
                    <TableHead className="font-mono text-xs">REVIEW</TableHead>
                    <TableHead className="font-mono text-xs">DATE</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((s) => {
                    const r = ratingDisplay(s.rating);
                    const reviewed = s.humanReviewStatus === "reviewed";
                    return (
                      <TableRow
                        key={s.id}
                        className="cursor-pointer"
                        onClick={() => setSelectedId(s.id)}
                      >
                        <TableCell>
                          <div className="font-medium text-sm">{s.candidateName}</div>
                          <div className="text-xs text-muted-foreground">{s.candidateEmail}</div>
                        </TableCell>
                        <TableCell className="text-sm">{s.roleTitle}</TableCell>
                        <TableCell>
                          <span className="font-mono text-xs text-muted-foreground">
                            {s.status.toUpperCase()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {s.overallScore !== null ? s.overallScore : "—"}
                        </TableCell>
                        <TableCell>
                          {s.rating ? (
                            <Badge className={`font-mono text-[10px] ${r.color}`}>{r.label}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {s.overallScore === null ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            <Badge
                              variant="outline"
                              className={`font-mono text-[10px] ${
                                reviewed
                                  ? "border-green-500/40 text-green-500"
                                  : "border-amber-500/40 text-amber-500"
                              }`}
                            >
                              {reviewed ? "REVIEWED" : "PENDING"}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(s.createdAt)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {selectedId !== null && (
        <AdminSessionDetailDialog sessionId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
