import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "../components/navbar";
import { Footer } from "../components/footer";
import { useCurrentCandidate } from "../lib/use-candidate";
import { extractCvText } from "../lib/extract-cv";
import {
  useUpdateCurrentCandidate,
  useUploadCurrentCandidateCV,
  getGetCurrentCandidateQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  UploadCloud, FileText, CheckCircle2, ArrowRight, Loader2, Mail, Phone, MapPin, User, AlertTriangle,
} from "lucide-react";

interface CvSection {
  heading: string;
  content: string;
}

export default function Profile() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { candidate, isLoading: isLoadingCandidate } = useCurrentCandidate();

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [years, setYears] = useState("");
  const [skills, setSkills] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation_] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  const [summary, setSummary] = useState<string | null>(null);
  const [sections, setSections] = useState<CvSection[]>([]);
  const [cvFileName, setCvFileName] = useState<string | null>(null);

  // Populate form + parsed CV from the candidate record (once, then on uploads).
  const applyCandidate = (c: NonNullable<typeof candidate>, overwrite: boolean) => {
    if (overwrite || !name) setName(c.name ?? "");
    if (overwrite || !phone) setPhone(c.phone ?? "");
    if (overwrite || !location) setLocation_(c.location ?? "");
    if (overwrite || !skills) setSkills((c.skills ?? []).join(", "));
    setLinkedinUrl(c.linkedinUrl ?? "");
    setSummary(c.cvParsed?.summary ?? null);
    setSections(c.cvParsed?.sections ?? []);
    setCvFileName(c.cvFileName ?? null);
  };

  useEffect(() => {
    if (candidate && !prefilled) {
      const pendingRole = sessionStorage.getItem("pendingRole");
      setRole(candidate.role || pendingRole || "");
      setYears(candidate.yearsOfExperience ? String(candidate.yearsOfExperience) : "");
      applyCandidate(candidate, true);
      setPrefilled(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate, prefilled]);

  const updateCandidate = useUpdateCurrentCandidate();
  const uploadCV = useUploadCurrentCandidateCV();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setError(null);
    setExtracting(true);
    try {
      const text = await extractCvText(selectedFile);
      if (!text.trim()) {
        setError("Could not read any text from that file. Try a different export of your CV.");
        return;
      }
      const updated = await uploadCV.mutateAsync({
        data: { cvFileName: selectedFile.name, cvText: text },
      });
      await queryClient.invalidateQueries({ queryKey: getGetCurrentCandidateQueryKey() });
      // Auto-populate the form from the parsed CV, preferring freshly parsed
      // contact details so the candidate can review them before saving.
      applyCandidate(updated, true);
      if (updated.cvParsed?.name) setName(updated.cvParsed.name);
      if (updated.cvParsed?.phone) setPhone(updated.cvParsed.phone);
      if (updated.cvParsed?.location) setLocation_(updated.cvParsed.location);
      if (updated.yearsOfExperience) setYears(String(updated.yearsOfExperience));
    } catch (err) {
      setError(
        "We couldn't process that file. Supported formats are PDF, DOCX and TXT."
      );
    } finally {
      setExtracting(false);
    }
  };

  const alreadyComplete = !!candidate?.profileComplete;
  const isPending = updateCandidate.isPending || uploadCV.isPending || extracting;

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
          phone: phone.trim() || undefined,
          location: location.trim() || undefined,
          skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
          linkedinUrl: linkedinUrl.trim() || undefined,
        },
      });

      sessionStorage.removeItem("pendingRole");
      await queryClient.invalidateQueries({ queryKey: getGetCurrentCandidateQueryKey() });
      setLocation("/dashboard");
    } catch {
      setError("Something went wrong saving your profile. Please try again.");
    }
  };

  if (isLoadingCandidate) {
    return (
      <div className="min-h-screen flex items-center justify-center font-mono text-muted-foreground">
        LOADING_PROFILE...
      </div>
    );
  }

  const skillList = skills.split(",").map((s) => s.trim()).filter(Boolean);

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <Navbar />

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#80808010_1px,transparent_1px),linear-gradient(to_bottom,#80808010_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[360px] w-[720px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />

      <main className="z-10 mx-auto w-full max-w-6xl flex-1 space-y-8 px-4 py-10">
        {/* Header */}
        <div className="border-b border-border/60 pb-6">
          <div className="flex items-center gap-2 text-primary">
            <FileText className="h-5 w-5" />
            <span className="font-mono text-sm tracking-wider">CONTEXT_INGESTION</span>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Candidate Profile</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Upload your CV to auto-fill your details, then review everything below. This context
            calibrates how the AI interviewer assesses you.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left column — CV upload + parsed sections */}
          <div className="space-y-6 lg:col-span-2 lg:order-2">
            <Card className="border-primary/20 bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <UploadCloud className="h-5 w-5 text-primary" /> Curriculum Vitae
                </CardTitle>
                <CardDescription>
                  PDF, DOCX or TXT. We extract your details automatically.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-secondary/20 p-8 transition-colors hover:bg-secondary/40">
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={handleFileChange}
                    disabled={extracting || uploadCV.isPending}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                  />
                  {extracting || uploadCV.isPending ? (
                    <div className="text-center">
                      <Loader2 className="mx-auto mb-3 h-9 w-9 animate-spin text-primary" />
                      <p className="font-mono text-sm">Reading your CV…</p>
                    </div>
                  ) : file || cvFileName ? (
                    <div className="text-center">
                      <CheckCircle2 className="mx-auto mb-3 h-9 w-9 text-primary" />
                      <p className="font-mono text-sm">{file?.name ?? cvFileName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Click to replace</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <UploadCloud className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
                      <p className="font-mono text-sm">Click to select file or drag and drop</p>
                      <p className="mt-1 text-xs text-muted-foreground">PDF, DOCX, TXT</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {summary && (
              <Card className="border-border/60 bg-card/40">
                <CardHeader className="pb-3">
                  <CardTitle className="font-mono text-sm tracking-wide text-primary">SUMMARY</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{summary}</p>
                </CardContent>
              </Card>
            )}

            {sections.length > 0 ? (
              <Card className="border-border/60 bg-card/40">
                <CardHeader className="pb-3">
                  <CardTitle className="font-mono text-sm tracking-wide text-primary">
                    PARSED_CV // {sections.length} SECTIONS
                  </CardTitle>
                  <CardDescription>Everything we extracted from your resume.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {sections.map((s, i) => (
                    <div key={`${s.heading}-${i}`} className="border-l-2 border-primary/30 pl-4">
                      <h3 className="font-semibold tracking-tight">{s.heading}</h3>
                      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                        {s.content}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed border-border/60 bg-card/20">
                <CardContent className="flex flex-col items-center gap-2 py-10 text-center font-mono text-xs text-muted-foreground">
                  <FileText className="h-8 w-8 opacity-30" />
                  <p>NO_CV_PARSED_YET</p>
                  <p className="text-[10px] opacity-60">Upload your CV to see your details here</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right column — editable fields */}
          <div className="space-y-6 lg:order-1">
            <Card className="border-primary/20 bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5 text-primary" /> Your Details
                </CardTitle>
                <CardDescription>Auto-filled from your CV — edit anything that's off.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="font-mono text-xs tracking-wide">FULL_NAME</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 font-mono text-xs tracking-wide">
                    <Mail className="h-3 w-3" /> EMAIL
                  </Label>
                  <Input value={candidate?.email ?? ""} readOnly disabled className="opacity-70" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-1.5 font-mono text-xs tracking-wide">
                    <Phone className="h-3 w-3" /> PHONE
                  </Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 000 1234" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="flex items-center gap-1.5 font-mono text-xs tracking-wide">
                    <MapPin className="h-3 w-3" /> LOCATION
                  </Label>
                  <Input id="location" value={location} onChange={(e) => setLocation_(e.target.value)} placeholder="San Francisco, CA" />
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
                  <Label htmlFor="skills" className="font-mono text-xs tracking-wide">
                    SKILLS <span className="opacity-50">(comma-separated)</span>
                  </Label>
                  <Input id="skills" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="TypeScript, React, PostgreSQL" />
                  {skillList.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {skillList.slice(0, 24).map((s) => (
                        <span key={s} className="rounded border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linkedin" className="font-mono text-xs tracking-wide">
                    LINKEDIN_URL <span className="opacity-50">(optional)</span>
                  </Label>
                  <Input id="linkedin" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/..." />
                </div>

                {error && (
                  <p className="flex items-start gap-2 text-sm text-destructive">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
                  </p>
                )}

                <Button className="h-12 w-full font-mono text-sm tracking-wider" disabled={isPending} onClick={handleSubmit}>
                  {isPending ? "SAVING..." : (<>FINALIZE PROFILE <ArrowRight className="ml-2 h-4 w-4" /></>)}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
