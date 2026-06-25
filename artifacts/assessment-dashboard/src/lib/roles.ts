import {
  Brain, Cpu, Zap, MessageSquare, FileText, Sparkles, Bot, Server, Cloud, Settings,
  Database, FileEdit, BarChart3, Shield, AlertTriangle, Scale, Briefcase, Kanban, FlaskConical,
  Atom, Microscope, Beaker, Stethoscope, HeartPulse, Dna, FileCheck, Gavel, TrendingUp, DollarSign, PieChart,
  type LucideIcon,
} from "lucide-react";

export type RoleCategory =
  | "AI & ML Engineering"
  | "LLM & NLP"
  | "Infrastructure & MLOps"
  | "AI Training & Data"
  | "AI Safety & Ethics"
  | "Product & Program"
  | "Science & Research"
  | "Healthcare & AI"
  | "Governance & Legal"
  | "Finance & Quant";

export interface Role {
  title: string;
  category: RoleCategory;
  desc: string;
  icon: LucideIcon;
  color: string;
}

export const ROLE_CATEGORIES: RoleCategory[] = [
  "AI & ML Engineering",
  "LLM & NLP",
  "Infrastructure & MLOps",
  "AI Training & Data",
  "AI Safety & Ethics",
  "Product & Program",
  "Science & Research",
  "Healthcare & AI",
  "Governance & Legal",
  "Finance & Quant",
];

export const ALL_ROLES: Role[] = [
  // AI & ML Engineering
  { title: "Machine Learning Engineer", category: "AI & ML Engineering", desc: "Production ML systems, feature pipelines, model deployment & monitoring.", icon: Brain, color: "text-purple-400" },
  { title: "AI Engineer", category: "AI & ML Engineering", desc: "Building AI-powered products: model integration, APIs, and evaluation.", icon: Cpu, color: "text-cyan-400" },
  { title: "Deep Learning Engineer", category: "AI & ML Engineering", desc: "Neural architecture, training at scale, and GPU optimization.", icon: Zap, color: "text-amber-400" },
  { title: "AI Research Scientist", category: "AI & ML Engineering", desc: "Novel model research, experimentation, and state-of-the-art publishing.", icon: Sparkles, color: "text-violet-400" },

  // LLM & NLP
  { title: "LLM Engineer", category: "LLM & NLP", desc: "Fine-tuning, RAG pipelines, inference optimization, and LLM evaluation.", icon: MessageSquare, color: "text-blue-400" },
  { title: "NLP Engineer", category: "LLM & NLP", desc: "Text processing, embeddings, NER, and language model applications.", icon: FileText, color: "text-sky-400" },
  { title: "Prompt Engineer", category: "LLM & NLP", desc: "Prompt design, evaluation, and reliable structured LLM outputs.", icon: Sparkles, color: "text-pink-400" },
  { title: "AI Agent Engineer", category: "LLM & NLP", desc: "Autonomous agents, tool use, planning, and multi-step orchestration.", icon: Bot, color: "text-indigo-400" },

  // Infrastructure & MLOps
  { title: "MLOps Engineer", category: "Infrastructure & MLOps", desc: "CI/CD for ML, model registries, deployment automation, and monitoring.", icon: Server, color: "text-orange-400" },
  { title: "ML Infrastructure Engineer", category: "Infrastructure & MLOps", desc: "GPU clusters, distributed training, and high-throughput serving.", icon: Cloud, color: "text-blue-400" },
  { title: "Systems Engineer", category: "Infrastructure & MLOps", desc: "Low-level performance, reliability, and scalable systems engineering.", icon: Settings, color: "text-slate-400" },

  // AI Training & Data
  { title: "AI Trainer", category: "AI Training & Data", desc: "Curating training data, instruction tuning, and shaping model behavior.", icon: FileEdit, color: "text-emerald-400" },
  { title: "RLHF Trainer", category: "AI Training & Data", desc: "Reinforcement learning from human feedback, reward & preference modeling.", icon: BarChart3, color: "text-teal-400" },
  { title: "AI Evaluator", category: "AI Training & Data", desc: "Designing evals, benchmarks, and quality measurement for AI systems.", icon: BarChart3, color: "text-cyan-400" },
  { title: "Data Annotation Specialist", category: "AI Training & Data", desc: "High-quality labeling, annotation guidelines, and inter-rater reliability.", icon: Database, color: "text-green-400" },

  // AI Safety & Ethics
  { title: "AI Safety Researcher", category: "AI Safety & Ethics", desc: "Alignment, robustness, and mitigating risks from advanced AI.", icon: Shield, color: "text-red-400" },
  { title: "Red Team Specialist", category: "AI Safety & Ethics", desc: "Adversarial testing, jailbreaks, and probing model failure modes.", icon: AlertTriangle, color: "text-orange-400" },
  { title: "AI Ethics Consultant", category: "AI Safety & Ethics", desc: "Fairness, bias auditing, and responsible AI policy.", icon: Scale, color: "text-yellow-400" },

  // Product & Program
  { title: "AI Product Manager", category: "Product & Program", desc: "AI product strategy, roadmaps, and turning research into value.", icon: Briefcase, color: "text-amber-400" },
  { title: "Technical Program Manager", category: "Product & Program", desc: "Cross-team coordination, delivery, and complex technical programs.", icon: Kanban, color: "text-blue-400" },
  { title: "Applied Scientist", category: "Product & Program", desc: "Bridging research and engineering to ship measurable model gains.", icon: FlaskConical, color: "text-purple-400" },

  // Science & Research
  { title: "Quantum Scientist", category: "Science & Research", desc: "Quantum algorithms, error correction, and quantum-classical methods.", icon: Atom, color: "text-violet-400" },
  { title: "AI4Science Researcher", category: "Science & Research", desc: "Applying ML to discovery across physics, materials, and biology.", icon: Microscope, color: "text-pink-400" },
  { title: "Computational Biologist", category: "Science & Research", desc: "Modeling biological systems, genomics, and simulation.", icon: Beaker, color: "text-green-400" },
  { title: "Computational Chemist", category: "Science & Research", desc: "Molecular modeling, simulations, and ML-driven chemistry.", icon: FlaskConical, color: "text-teal-400" },

  // Healthcare & AI
  { title: "Radiologist", category: "Healthcare & AI", desc: "Medical imaging diagnosis and AI-assisted radiology workflows.", icon: Stethoscope, color: "text-red-400" },
  { title: "Oncologist", category: "Healthcare & AI", desc: "Cancer diagnosis, treatment planning, and precision oncology.", icon: HeartPulse, color: "text-rose-400" },
  { title: "Bioinformatics Scientist", category: "Healthcare & AI", desc: "Sequencing analysis, pipelines, and biological data at scale.", icon: Dna, color: "text-emerald-400" },
  { title: "Physician-AI", category: "Healthcare & AI", desc: "Clinical practice augmented by AI decision support.", icon: Stethoscope, color: "text-pink-400" },

  // Governance & Legal
  { title: "AI Compliance Officer", category: "Governance & Legal", desc: "Regulatory compliance, audits, and AI risk controls.", icon: FileCheck, color: "text-blue-400" },
  { title: "AI Governance Manager", category: "Governance & Legal", desc: "AI policy, oversight frameworks, and organizational governance.", icon: Scale, color: "text-slate-400" },
  { title: "Data Privacy Attorney", category: "Governance & Legal", desc: "Privacy law, GDPR/CCPA, and data protection counsel.", icon: Gavel, color: "text-amber-400" },

  // Finance & Quant
  { title: "Quant Analyst", category: "Finance & Quant", desc: "Statistical modeling, signal research, and risk analytics.", icon: TrendingUp, color: "text-green-400" },
  { title: "Quant Trader", category: "Finance & Quant", desc: "Systematic trading strategies, execution, and market microstructure.", icon: DollarSign, color: "text-emerald-400" },
  { title: "Financial Analyst (AI)", category: "Finance & Quant", desc: "AI-driven financial modeling, forecasting, and valuation.", icon: PieChart, color: "text-teal-400" },
];
