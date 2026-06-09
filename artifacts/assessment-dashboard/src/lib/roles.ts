import {
  Code2, Server, Brain, Cloud, Briefcase, Globe,
  Zap, Cpu, Smartphone, Database, Lock,
  type LucideIcon,
} from "lucide-react";

export type RoleCategory =
  | "Engineering"
  | "Infrastructure"
  | "Data & AI"
  | "Security"
  | "Product";

export interface Role {
  title: string;
  category: RoleCategory;
  desc: string;
  icon: LucideIcon;
  color: string;
}

export const ROLE_CATEGORIES: RoleCategory[] = [
  "Engineering",
  "Infrastructure",
  "Data & AI",
  "Security",
  "Product",
];

export const ALL_ROLES: Role[] = [
  { title: "Cybersecurity Analyst", category: "Security", desc: "Threat analysis, incident response, SIEM, vulnerability management.", icon: Lock, color: "text-red-400" },
  { title: "Senior Software Engineer", category: "Engineering", desc: "System architecture, full-stack complexity, scalability.", icon: Code2, color: "text-cyan-400" },
  { title: "DevOps / Site Reliability Engineer", category: "Infrastructure", desc: "CI/CD pipelines, Kubernetes, observability, platform engineering.", icon: Server, color: "text-orange-400" },
  { title: "Data Scientist / ML Engineer", category: "Data & AI", desc: "ML model design, feature engineering, experimentation at scale.", icon: Brain, color: "text-purple-400" },
  { title: "Cloud Architect", category: "Infrastructure", desc: "AWS/GCP/Azure design, Terraform, distributed systems.", icon: Cloud, color: "text-blue-400" },
  { title: "Product Manager (Technical)", category: "Product", desc: "Technical roadmaps, stakeholder alignment, product strategy.", icon: Briefcase, color: "text-yellow-400" },
  { title: "Full-Stack Developer", category: "Engineering", desc: "End-to-end features across frontend, backend, and database layers.", icon: Globe, color: "text-emerald-400" },
  { title: "Backend Engineer (Node.js / Python)", category: "Engineering", desc: "High-performance APIs, microservices, distributed systems.", icon: Zap, color: "text-amber-400" },
  { title: "Frontend Engineer (React)", category: "Engineering", desc: "React performance, accessibility, component architecture.", icon: Cpu, color: "text-sky-400" },
  { title: "AI / LLM Engineer", category: "Data & AI", desc: "LLM fine-tuning, RAG pipelines, prompt engineering, MLOps.", icon: Brain, color: "text-violet-400" },
  { title: "Mobile Developer (iOS/Android)", category: "Engineering", desc: "Native and cross-platform apps, performance, device APIs.", icon: Smartphone, color: "text-rose-400" },
  { title: "Database Administrator", category: "Infrastructure", desc: "Schema design, query optimization, replication, reliability.", icon: Database, color: "text-teal-400" },
];
