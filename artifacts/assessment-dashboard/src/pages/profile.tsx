import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCandidate } from "../lib/use-candidate";
import { useUploadCandidateCV, useGetCandidate } from "@workspace/api-client-react";
import { UploadCloud, FileText, CheckCircle2, ArrowRight } from "lucide-react";

export default function Profile() {
  const [, setLocation] = useLocation();
  const { candidateId } = useCandidate();
  const [file, setFile] = useState<File | null>(null);
  const [cvText, setCvText] = useState<string>("");

  useEffect(() => {
    if (!candidateId) {
      setLocation("/register");
    }
  }, [candidateId, setLocation]);

  const { data: candidate, isLoading: isLoadingCandidate } = useGetCandidate(candidateId as number);

  const uploadCV = useUploadCandidateCV();

  if (!candidateId) {
    return null;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Simulate reading PDF text
      const reader = new FileReader();
      reader.onload = (e) => {
        // In a real app we'd parse PDF. Here we just mock extracted text
        setCvText("Mock extracted CV content from " + selectedFile.name);
      };
      reader.readAsText(selectedFile);
    }
  };

  const handleUpload = () => {
    if (!file || !cvText) return;
    
    uploadCV.mutate(
      {
        id: candidateId,
        data: {
          cvFileName: file.name,
          cvText: cvText,
        }
      },
      {
        onSuccess: () => {
          setLocation("/dashboard");
        }
      }
    );
  };

  if (isLoadingCandidate) {
    return <div className="min-h-screen flex items-center justify-center font-mono">LOADING_PROFILE...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-lg border-primary/20 shadow-[0_0_50px_-12px_rgba(6,182,212,0.1)]">
        <CardHeader className="space-y-1 pb-8 border-b border-border mb-6">
          <div className="flex items-center gap-2 mb-2 text-primary">
            <FileText className="h-5 w-5" />
            <span className="font-mono text-sm tracking-wider">CONTEXT_INGESTION</span>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">Upload Curriculum Vitae</CardTitle>
          <CardDescription className="text-muted-foreground">
            Provide background context for the AI interviewer to calibrate technical depth.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          <div className="border-2 border-dashed border-border rounded-lg p-10 flex flex-col items-center justify-center bg-secondary/20 hover:bg-secondary/40 transition-colors relative">
            <input 
              type="file" 
              accept=".pdf,.doc,.docx,.txt" 
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            {file ? (
              <div className="text-center">
                <CheckCircle2 className="h-10 w-10 text-primary mx-auto mb-4" />
                <p className="font-mono text-sm">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-2">Ready for ingestion</p>
              </div>
            ) : (
              <div className="text-center">
                <UploadCloud className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                <p className="font-mono text-sm">Click to select file or drag and drop</p>
                <p className="text-xs text-muted-foreground mt-2">PDF, DOCX, TXT</p>
              </div>
            )}
          </div>

          <Button 
            className="w-full font-mono text-sm tracking-wider h-12" 
            disabled={!file || uploadCV.isPending}
            onClick={handleUpload}
          >
            {uploadCV.isPending ? "INGESTING..." : (
              <>FINALIZE PROFILE <ArrowRight className="ml-2 h-4 w-4" /></>
            )}
          </Button>

        </CardContent>
      </Card>
    </div>
  );
}
