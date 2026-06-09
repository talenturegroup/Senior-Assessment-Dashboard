import { useLocation, useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCreateCandidate } from "@workspace/api-client-react";
import { useCandidate } from "../lib/use-candidate";
import { Terminal } from "lucide-react";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  role: z.string().min(1, "Please select a role"),
  yearsOfExperience: z.coerce.number().min(5, "This platform requires 5+ years of experience"),
  skills: z.string().min(2, "Enter at least one skill"),
  linkedinUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
});

const ROLES = [
  "Cybersecurity Analyst",
  "Senior Software Engineer",
  "DevOps / Site Reliability Engineer",
  "Data Scientist / ML Engineer",
  "Cloud Architect",
  "Product Manager (Technical)",
  "Full-Stack Developer",
  "Backend Engineer (Node.js / Python)",
  "Frontend Engineer (React)",
  "AI / LLM Engineer",
  "Mobile Developer (iOS/Android)",
  "Database Administrator",
];

export default function Register() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const preselectedRole = params.get("role") ?? "";

  const { setCandidateId } = useCandidate();
  const createCandidate = useCreateCandidate();

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      role: preselectedRole,
      yearsOfExperience: 5,
      skills: "",
      linkedinUrl: "",
    },
  });

  const onSubmit = (values: z.infer<typeof registerSchema>) => {
    createCandidate.mutate(
      {
        data: {
          name: values.name,
          email: values.email,
          role: values.role,
          yearsOfExperience: values.yearsOfExperience,
          skills: values.skills.split(",").map((s) => s.trim()).filter(Boolean),
          linkedinUrl: values.linkedinUrl || undefined,
        },
      },
      {
        onSuccess: (candidate) => {
          setCandidateId(candidate.id);
          setLocation("/profile");
        },
        onError: (err: unknown) => {
          const msg =
            err && typeof err === "object" && "data" in err
              ? (err as { data?: { error?: string } }).data?.error
              : null;
          if (msg?.includes("already exists")) {
            form.setError("email", { message: "This email is already registered" });
          }
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-lg border-primary/20 shadow-[0_0_50px_-12px_rgba(6,182,212,0.1)]">
        <CardHeader className="space-y-1 pb-8 border-b border-border mb-6">
          <div className="flex items-center gap-2 mb-2 text-primary">
            <Terminal className="h-5 w-5" />
            <span className="font-mono text-sm tracking-wider">CANDIDATE_REGISTRATION</span>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">Create Profile</CardTitle>
          <CardDescription className="text-muted-foreground">
            {preselectedRole
              ? `Registering for: ${preselectedRole}`
              : "Initialize your senior assessment protocol."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                        Full Name
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" className="bg-secondary/50 font-mono" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                        Email
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="john@example.com"
                          type="email"
                          className="bg-secondary/50 font-mono"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                        Target Role
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-secondary/50 font-mono">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ROLES.map((role) => (
                            <SelectItem key={role} value={role}>
                              {role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="yearsOfExperience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                        Years of Experience
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={5}
                          className="bg-secondary/50 font-mono"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="skills"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      Core Skills (comma-separated)
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="React, Node.js, System Design, AWS"
                        className="bg-secondary/50 font-mono"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="linkedinUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      LinkedIn (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://linkedin.com/in/johndoe"
                        className="bg-secondary/50 font-mono"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {createCandidate.isError && (
                <p className="text-sm text-destructive font-mono">
                  Registration failed. Please check your details and try again.
                </p>
              )}

              <Button
                type="submit"
                className="w-full font-mono text-sm tracking-wider h-12 mt-2"
                disabled={createCandidate.isPending}
              >
                {createCandidate.isPending ? "INITIALIZING..." : "PROCEED TO CV UPLOAD"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
