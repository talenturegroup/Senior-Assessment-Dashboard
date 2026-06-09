import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentCandidate } from "../lib/use-candidate";
import {
  useUpdateCurrentCandidate,
  useUploadCurrentCandidateCV,
  getGetCurrentCandidateQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { UploadCloud, FileText, CheckCircle2, ArrowRight } from "lucide-react";

export default function Profile() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { candidate, isLoading: isLoadingCandidate } = useCurrentCandidate();

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [years, setYears] = useState("");
  const [skills, setSkills] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [cvText, setCvText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    if (candidate && !prefilled) {
      setName(candidate.name ?? "");
      const pendingRole = sessionStorage.getItem("pendingRole");
      setRole(candidate.role || pendingRole || "");
      setYears(candidate.yearsOfExperience ? String(candidate.yearsOfExperience) : "");
      setSkills((candidate.skills ?? []).join(", "));
      setLinkedinUrl(candidate.linkedinUrl ?? "");
      setPrefilled(true);
    }
  }, [candidate, prefilled]);

  const updateCandidate = useUpdateCurrentCandidate();
  const uploadCV = useUploadCurrentCandidateCV();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = () => {
        setCvText("Mock extracted CV content from " + selectedFile.name);
      };
      reader.readAsText(selectedFile);
    }
  };

  const alreadyComplete = !!candidate?.profileComplete;
  const isPending = updateCandidate.isPending || uploadCV.isPending;

  const handleSubmit = async () => {
    setError(null);
    const yearsNum = parseInt(years, 10);
    if (!name.trim() || !role.trim() || Number.isNaN(yearsNum)) {
      setError("Name, role, and years of experience are required.");
      return;
    }
    if (!alreadyComplete && !file) {
      setError("Please upload your CV to finalize your profile.");
      return;
    }

    try {
      await updateCandidate.mutateAsync({
        data: {
          name: name.trim(),
          role: role.trim(),
          yearsOfExperience: yearsNum,
          skills: skills
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          linkedinUrl: linkedinUrl.trim() || undefined,
        },
      });

      if (file && cvText) {
        await uploadCV.mutateAsync({
          data: { cvFileName: file.name, cvText },
        });
      }

      sessionStorage.removeItem("pendingRole");
      await queryClient.invalidateQueries({ queryKey: getGetCurrentCandidateQueryKey() });
      setLocation("/dashboard");
    } catch {
      setError("Something went wrong saving your profile. Please try again.");
    }
  };

  if (isLoadingCandidate) {
    return <div className="min-h-screen flex items-center justify-center font-mono">LOADING_PROFILE...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-lg border-primary/20 shadow-[0_0_50px_-12px_rgba(6,182,212,0.1)]">
        <CardHeader className="space-y-1 pb-6 border-b border-border mb-6">
          <div className="flex items-center gap-2 mb-2 text-primary">
            <FileText className="h-5 w-5" />
            <span className="font-mono text-sm tracking-wider">CONTEXT_INGESTION</span>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">Candidate Profile</CardTitle>
          <CardDescription className="text-muted-foreground">
            Provide background context so the AI interviewer can calibrate technical depth.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name" className="font-mono text-xs tracking-wide">FULL_NAME</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role" className="font-mono text-xs tracking-wide">TARGET_ROLE</Label>
            <Input id="role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Senior Software Engineer" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="years" className="font-mono text-xs tracking-wide">YEARS_OF_EXPERIENCE</Label>
            <Input id="years" type="number" min={0} value={years} onChange={(e) => setYears(e.target.value)} placeholder="5" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="skills" className="font-mono text-xs tracking-wide">SKILLS <span className="opacity-50">(comma-separated)</span></Label>
            <Input id="skills" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="TypeScript, React, PostgreSQL" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedin" className="font-mono text-xs tracking-wide">LINKEDIN_URL <span className="opacity-50">(optional)</span></Label>
            <Input id="linkedin" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/..." />
          </div>

          <div className="space-y-2">
            <Label className="font-mono text-xs tracking-wide">
              CURRICULUM_VITAE {alreadyComplete && <span className="opacity-50">(re-upload to replace)</span>}
            </Label>
            <div className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center bg-secondary/20 hover:bg-secondary/40 transition-colors relative">
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {file ? (
                <div className="text-center">
                  <CheckCircle2 className="h-9 w-9 text-primary mx-auto mb-3" />
                  <p className="font-mono text-sm">{file.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">Ready for ingestion</p>
                </div>
              ) : candidate?.cvFileName ? (
                <div className="text-center">
                  <CheckCircle2 className="h-9 w-9 text-primary/70 mx-auto mb-3" />
                  <p className="font-mono text-sm">{candidate.cvFileName}</p>
                  <p className="text-xs text-muted-foreground mt-1">On file — click to replace</p>
                </div>
              ) : (
                <div className="text-center">
                  <UploadCloud className="h-9 w-9 text-muted-foreground mx-auto mb-3" />
                  <p className="font-mono text-sm">Click to select file or drag and drop</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, TXT</p>
                </div>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-destructive font-mono">{error}</p>}

          <Button
            className="w-full font-mono text-sm tracking-wider h-12"
            disabled={isPending}
            onClick={handleSubmit}
          >
            {isPending ? "INGESTING..." : (
              <>FINALIZE PROFILE <ArrowRight className="ml-2 h-4 w-4" /></>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
