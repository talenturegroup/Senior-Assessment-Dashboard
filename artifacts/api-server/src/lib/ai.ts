import OpenAI from "openai";
import { logger } from "./logger";

// Prefer the configured AI proxy (no user API key required); fall back
// to a direct OpenAI key if one is configured. When neither is present the SDK
// calls fail and every helper below degrades to its deterministic fallback.
const openaiBaseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
const openai = new OpenAI({
  apiKey:
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY ??
    process.env.OPENAI_API_KEY ??
    "missing",
  ...(openaiBaseUrl ? { baseURL: openaiBaseUrl } : {}),
});

export type QuestionType =
  | "technical"
  | "system_design"
  | "behavioral"
  | "coding"
  | "soft_skill";

const QUESTION_TYPES: QuestionType[] = [
  "technical",
  "system_design",
  "behavioral",
  "coding",
  "soft_skill",
];

export interface GeneratedQuestion {
  questionText: string;
  questionType: QuestionType;
  orderIndex: number;
}

/**
 * Returns true when a transcript is not a genuine attempt at answering
 * (empty, whitespace, or the placeholder the client sends for skips).
 */
export function isBlankAnswer(answer: string): boolean {
  const normalized = answer.trim().toLowerCase();
  if (normalized.length === 0) return true;
  if (normalized === "no answer provided." || normalized === "no answer provided")
    return true;
  // Fewer than 3 words and very short → not a substantive answer.
  const words = normalized.split(/\s+/).filter(Boolean);
  return words.length < 3 && normalized.length < 15;
}

export async function generateInterviewQuestions(
  role: string,
  cvText: string | null,
  jobDescription: string | null
): Promise<GeneratedQuestion[]> {
  const prompt = `You are a senior technical interviewer at a top-tier company. Generate exactly 8 senior-level interview questions for a ${role} candidate.

${cvText ? `Candidate CV:\n${cvText.slice(0, 2000)}\n\n` : ""}${jobDescription ? `Job Description:\n${jobDescription.slice(0, 1000)}\n\n` : ""}

Requirements:
- All questions must be at senior level (5+ years experience assumed)
- Mix: 2 soft_skill questions, 3 technical deep-dive questions, 2 coding questions, 1 system_design question
- soft_skill questions assess communication, collaboration, leadership, conflict resolution, and judgment
- coding questions ask the candidate to describe their approach/solution to a concrete programming problem relevant to a ${role}
- technical and system_design questions test depth of knowledge and architecture skills
- Order the questions so a soft_skill question comes first to ease the candidate in

Return ONLY valid JSON array with this format:
[
  {"questionText": "...", "questionType": "soft_skill", "orderIndex": 0},
  {"questionText": "...", "questionType": "technical", "orderIndex": 1},
  ...
]`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);
    const questions: Array<{ questionText?: string; question?: string; questionType?: string }> =
      Array.isArray(parsed) ? parsed : (parsed.questions ?? []);
    return questions.slice(0, 8).map((q, i) => ({
      questionText: q.questionText ?? q.question ?? `Question ${i + 1}`,
      questionType: (QUESTION_TYPES.includes((q.questionType ?? "") as QuestionType)
        ? q.questionType
        : "technical") as QuestionType,
      orderIndex: i,
    }));
  } catch (err) {
    logger.warn({ err }, "OpenAI question generation failed, using fallback questions");
    return getFallbackQuestions(role);
  }
}

export async function evaluateAnswer(
  question: string,
  answer: string,
  role: string
): Promise<{ score: number; feedback: string; strengths: string; weaknesses: string }> {
  // Hard zero for non-answers — never reward an empty or skipped response.
  if (isBlankAnswer(answer)) {
    return {
      score: 0,
      feedback: "No substantive answer was provided for this question.",
      strengths: "None — the question was left unanswered.",
      weaknesses: "The candidate did not attempt to answer this question.",
    };
  }

  const prompt = `You are evaluating a senior ${role} candidate's interview response.

Question: ${question}

Candidate's Answer: ${answer}

Evaluate this answer for a SENIOR-LEVEL position. Score 0-100 based on:
- Technical depth and accuracy
- Problem-solving approach
- Clarity of communication
- Real-world experience signals
- Seniority indicators

IMPORTANT: If the answer is empty, off-topic, gibberish, or does not genuinely attempt to address the question, score it 0. Do not award points for an answer that is not a real attempt.

Return ONLY valid JSON:
{
  "score": <0-100>,
  "feedback": "<2-3 sentences of specific feedback>",
  "strengths": "<1-2 specific strengths demonstrated>",
  "weaknesses": "<1-2 specific gaps or areas for improvement>"
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);
    return {
      score: Math.min(100, Math.max(0, Number(parsed.score) || 0)),
      feedback: parsed.feedback ?? "Answer evaluated.",
      strengths: parsed.strengths ?? "Demonstrated relevant knowledge.",
      weaknesses: parsed.weaknesses ?? "Could provide more depth.",
    };
  } catch (err) {
    logger.warn({ err }, "OpenAI answer evaluation failed, using deterministic fallback");
    // Deterministic, length-aware heuristic. Never a flat reward; empties already returned 0 above.
    const words = answer.trim().split(/\s+/).filter(Boolean).length;
    const score = Math.min(70, Math.max(10, Math.round(words * 1.5)));
    return {
      score,
      feedback:
        "Automated scoring was unavailable, so this answer received a provisional score based on its depth. A human reviewer should confirm it.",
      strengths: "Provided a response to the question.",
      weaknesses: "Could elaborate with concrete examples and metrics.",
    };
  }
}

export async function generateFinalEvaluation(
  role: string,
  answers: Array<{ question: string; transcript: string; score: number; questionType: string }>,
  cvText: string | null
): Promise<{
  overallScore: number;
  roleFitScore: number;
  rating: "strong_hire" | "hire" | "no_hire";
  technicalScore: number;
  communicationScore: number;
  domainScore: number;
  strengths: string;
  weaknesses: string;
  suggestions: string;
  readyForHiring: boolean;
  summary: string;
}> {
  const avgScore = answers.length > 0 ? Math.round(answers.reduce((s, a) => s + a.score, 0) / answers.length) : 0;
  const technicalAnswers = answers.filter(
    a => a.questionType === "technical" || a.questionType === "system_design" || a.questionType === "coding"
  );
  const behavioralAnswers = answers.filter(
    a => a.questionType === "behavioral" || a.questionType === "soft_skill"
  );

  const technicalScore = technicalAnswers.length > 0
    ? Math.round(technicalAnswers.reduce((s, a) => s + a.score, 0) / technicalAnswers.length)
    : avgScore;
  const communicationScore = behavioralAnswers.length > 0
    ? Math.round(behavioralAnswers.reduce((s, a) => s + a.score, 0) / behavioralAnswers.length)
    : Math.round(avgScore * 0.9);

  // No genuine answers at all → unambiguous zero, no AI call needed.
  if (answers.length === 0 || answers.every(a => isBlankAnswer(a.transcript))) {
    return {
      overallScore: 0,
      roleFitScore: 0,
      rating: "no_hire",
      technicalScore: 0,
      communicationScore: 0,
      domainScore: 0,
      strengths: "None — no substantive answers were provided.",
      weaknesses: "The candidate did not answer the interview questions.",
      suggestions: "Complete the interview by answering each question to receive a meaningful evaluation.",
      readyForHiring: false,
      summary: `The candidate did not provide substantive answers for the ${role} interview, so the assessment scored 0/100.`,
    };
  }

  const answersText = answers.map((a, i) =>
    `Q${i + 1} [${a.questionType}]: ${a.question}\nAnswer: ${a.transcript.slice(0, 300)}\nScore: ${a.score}/100`
  ).join("\n\n");

  const prompt = `You are a senior hiring manager evaluating a ${role} candidate's full interview performance.

${cvText ? `Candidate CV excerpt:\n${cvText.slice(0, 1000)}\n\n` : ""}Interview Responses Summary:
${answersText}

Average Score: ${avgScore}/100

Provide a comprehensive final evaluation. Return ONLY valid JSON:
{
  "strengths": "<2-3 specific key strengths demonstrated across the interview>",
  "weaknesses": "<2-3 specific gaps or concerns>",
  "suggestions": "<2-3 actionable improvement suggestions for the candidate>",
  "summary": "<3-4 sentence overall assessment of this candidate for the ${role} role>",
  "roleFitScore": <0-100 how well they fit this specific role>
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);
    const overallScore = Math.round((avgScore + (Number(parsed.roleFitScore) || avgScore)) / 2);
    const rating: "strong_hire" | "hire" | "no_hire" = overallScore >= 80 ? "strong_hire" : overallScore >= 65 ? "hire" : "no_hire";

    return {
      overallScore,
      roleFitScore: Math.min(100, Math.max(0, Number(parsed.roleFitScore) || avgScore)),
      rating,
      technicalScore,
      communicationScore,
      domainScore: Math.round((technicalScore + communicationScore) / 2),
      strengths: parsed.strengths ?? "Demonstrated solid technical knowledge.",
      weaknesses: parsed.weaknesses ?? "Some areas need deeper exploration.",
      suggestions: parsed.suggestions ?? "Continue practicing system design and communication.",
      readyForHiring: rating !== "no_hire",
      summary: parsed.summary ?? `${role} candidate with ${avgScore}/100 average performance.`,
    };
  } catch (err) {
    logger.warn({ err }, "OpenAI final evaluation failed, using computed fallback");
    const rating: "strong_hire" | "hire" | "no_hire" = avgScore >= 80 ? "strong_hire" : avgScore >= 65 ? "hire" : "no_hire";
    return {
      overallScore: avgScore,
      roleFitScore: avgScore,
      rating,
      technicalScore,
      communicationScore,
      domainScore: Math.round((technicalScore + communicationScore) / 2),
      strengths: "Demonstrated relevant technical knowledge and problem-solving ability.",
      weaknesses: "Some areas require deeper exploration for a senior-level role.",
      suggestions: "Focus on system design depth and quantifying past impact with metrics.",
      readyForHiring: rating !== "no_hire",
      summary: `Candidate completed the ${role} interview with an average score of ${avgScore}/100.`,
    };
  }
}

export interface ParsedCv {
  name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  summary: string | null;
  skills: string[];
  sections: Array<{ heading: string; content: string }>;
}

const CV_SECTION_HEADINGS = [
  "summary",
  "objective",
  "profile",
  "about",
  "experience",
  "work experience",
  "professional experience",
  "employment",
  "education",
  "skills",
  "technical skills",
  "projects",
  "certifications",
  "certificates",
  "awards",
  "achievements",
  "publications",
  "languages",
  "interests",
  "volunteer",
  "references",
  "contact",
];

/**
 * Deterministic CV parsing — used when OpenAI is unavailable. Extracts contact
 * details with regexes and splits the body into sections by recognised headings.
 */
export function parseCvDeterministic(cvText: string): ParsedCv {
  const text = cvText.replace(/\r\n/g, "\n").trim();
  const lines = text.split("\n").map((l) => l.trim());

  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = text.match(/(\+?\d[\d\s().-]{7,}\d)/);

  // The first non-empty line is usually the candidate's name.
  let name: string | null = null;
  for (const line of lines) {
    if (!line) continue;
    if (emailMatch && line.includes(emailMatch[0])) continue;
    if (/^\+?\d/.test(line)) continue;
    if (line.length <= 60 && /^[A-Za-z][A-Za-z.'\- ]+$/.test(line)) {
      name = line;
    }
    break;
  }

  // Location heuristic: a "City, ST" or "City, Country" style line near the top.
  let location: string | null = null;
  for (const line of lines.slice(0, 12)) {
    if (location) break;
    if (emailMatch && line.includes(emailMatch[0])) continue;
    const m = line.match(/^([A-Za-z.\- ]+,\s*[A-Za-z.\- ]{2,})$/);
    if (m && line.length <= 60) location = m[1].trim();
  }

  // Split into sections by recognised headings.
  const sections: Array<{ heading: string; content: string }> = [];
  let currentHeading: string | null = null;
  let buffer: string[] = [];
  const flush = () => {
    if (currentHeading && buffer.join("\n").trim()) {
      sections.push({ heading: currentHeading, content: buffer.join("\n").trim() });
    }
    buffer = [];
  };
  for (const line of lines) {
    const normalized = line.toLowerCase().replace(/[:•\-_]+$/g, "").trim();
    const isHeading =
      line.length > 0 &&
      line.length <= 40 &&
      CV_SECTION_HEADINGS.includes(normalized);
    if (isHeading) {
      flush();
      currentHeading = line.replace(/[:]+$/g, "").trim();
    } else if (currentHeading) {
      buffer.push(line);
    }
  }
  flush();

  // Skills: pull from a skills section if present.
  let skills: string[] = [];
  const skillSection = sections.find((s) => /skill/i.test(s.heading));
  if (skillSection) {
    skills = skillSection.content
      .split(/[,•\n|]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.length <= 40)
      .slice(0, 30);
  }

  const summarySection = sections.find((s) =>
    /summary|objective|profile|about/i.test(s.heading)
  );

  return {
    name,
    email: emailMatch ? emailMatch[0] : null,
    phone: phoneMatch ? phoneMatch[0].trim() : null,
    location,
    summary: summarySection ? summarySection.content : null,
    skills,
    sections:
      sections.length > 0
        ? sections
        : text
          ? [{ heading: "Resume", content: text.slice(0, 4000) }]
          : [],
  };
}

/**
 * Parse a CV into structured contact fields and sections. Uses OpenAI when a key
 * is configured and falls back to a deterministic parser otherwise.
 */
export async function parseCV(cvText: string): Promise<ParsedCv> {
  const fallback = parseCvDeterministic(cvText);
  if (!cvText.trim()) return fallback;

  const prompt = `Extract structured data from the following CV/resume text. Return ONLY valid JSON with this exact shape:
{
  "name": <full name or null>,
  "email": <email or null>,
  "phone": <phone number or null>,
  "location": <city/region or null>,
  "summary": <a 1-3 sentence professional summary or null>,
  "skills": [<list of individual skills, max 30>],
  "sections": [{ "heading": <section title>, "content": <the full text of that section> }]
}

Rules:
- Preserve every meaningful section of the CV (experience, education, projects, certifications, etc.) in "sections", in their original order.
- Keep section "content" readable but complete — do not omit roles, dates, or bullet points.
- If a field is missing, use null (or [] for skills).

CV text:
${cvText.slice(0, 8000)}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });
    const content = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);
    const sections = Array.isArray(parsed.sections)
      ? parsed.sections
        .filter((s: any) => s && (s.heading || s.content))
        .map((s: any) => ({
          heading: String(s.heading ?? "Section"),
          content: String(s.content ?? ""),
        }))
        .filter((s: { content: string }) => s.content.trim().length > 0)
      : [];
    const skills = Array.isArray(parsed.skills)
      ? parsed.skills.map((s: any) => String(s).trim()).filter(Boolean).slice(0, 30)
      : [];
    return {
      name: parsed.name ? String(parsed.name) : fallback.name,
      email: parsed.email ? String(parsed.email) : fallback.email,
      phone: parsed.phone ? String(parsed.phone) : fallback.phone,
      location: parsed.location ? String(parsed.location) : fallback.location,
      summary: parsed.summary ? String(parsed.summary) : fallback.summary,
      skills: skills.length > 0 ? skills : fallback.skills,
      sections: sections.length > 0 ? sections : fallback.sections,
    };
  } catch (err) {
    logger.warn({ err }, "OpenAI CV parsing failed, using deterministic fallback");
    return fallback;
  }
}

interface RoleQuestionSet {
  technical: [string, string, string];
  coding: [string, string];
  systemDesign: string;
}

// Two role-agnostic soft-skill prompts asked of every candidate (one to open the
// interview, one mid-way). Soft skills are not role-specific, so these are shared.
const SOFT_SKILL_QUESTIONS: [string, string] = [
  "To start, tell me about a time you had a disagreement with a teammate on an important technical decision. How did you work through it and what was the outcome?",
  "How do you communicate complex technical trade-offs to non-technical stakeholders? Walk me through a specific example.",
];

// Role-specific deterministic question banks. These are used when the AI question
// generator is unavailable, so each role still gets a tailored interview instead
// of one shared set. Keys must match the role titles in the dashboard's roles.ts.
const ROLE_QUESTION_BANK: Record<string, RoleQuestionSet> = {
  "Cybersecurity Analyst": {
    technical: [
      "Walk me through how you would investigate and respond to a suspected data exfiltration alert from your SIEM. Which signals do you prioritize and how do you contain it?",
      "How do you run vulnerability management at scale — from discovery and prioritization (CVSS, exploitability, asset criticality) to remediation tracking across hundreds of assets?",
      "Explain the difference between signature-based detection and behavioral/anomaly detection. When do you invest in each, and how do you keep false positives manageable?",
    ],
    coding: [
      "You need to scan a large volume of authentication logs to flag brute-force attempts. Describe the data structures and approach you'd use to detect more than 10 failed logins per account within a 5-minute window.",
      "Describe how you'd write a tool to enrich indicators of compromise (IPs, domains, hashes) against several threat-intel feeds efficiently, handling rate limits and caching.",
    ],
    systemDesign:
      "Design a centralized logging and threat-detection pipeline for a mid-size company: log collection, normalization, correlation, alerting, and the analyst workflow. What are the key trade-offs?",
  },
  "Senior Software Engineer": {
    technical: [
      "Describe the most complex system you've architected. What were the key design decisions and trade-offs, and what would you change in hindsight?",
      "How do you approach refactoring a large legacy codebase that has little test coverage while continuing to ship features safely?",
      "How do you reason about consistency, availability, and partition tolerance when designing a distributed service? Give a concrete example.",
    ],
    coding: [
      "Given an array of integers, walk me through finding the two numbers that add up to a target value. Compare a brute-force approach with an optimal one and discuss time and space complexity.",
      "Describe how you'd implement an LRU cache with O(1) get and put. What data structures make that possible?",
    ],
    systemDesign:
      "Design a URL shortener that handles 10M+ redirects per day. Cover the data model, ID generation, caching, and how you'd scale reads.",
  },
  "DevOps / Site Reliability Engineer": {
    technical: [
      "Walk me through how you'd design a CI/CD pipeline for a microservices system. How do you handle testing, progressive delivery, and rollbacks?",
      "How do you approach observability — metrics, logs, and traces — and how do you define meaningful SLOs and error budgets?",
      "A production service is degraded with rising latency. Walk me through your incident response and how you'd isolate the root cause.",
    ],
    coding: [
      "Describe how you'd write a tool to safely perform a rolling restart of pods across a Kubernetes cluster while respecting readiness checks and disruption budgets.",
      "How would you implement an alert that predicts when a disk will run out of space within N hours based on its recent growth rate?",
    ],
    systemDesign:
      "Design a highly available, multi-region deployment for a critical API. Cover traffic routing, failover, data replication, and how you'd test resilience.",
  },
  "Data Scientist / ML Engineer": {
    technical: [
      "Walk me through how you'd frame, build, and validate a model to predict customer churn. How do you select features and avoid data leakage?",
      "How do you detect and handle data drift and model degradation once a model is serving production traffic?",
      "Explain how you'd design an A/B experiment to measure the real-world impact of a new model, including how you'd handle confounders and statistical significance.",
    ],
    coding: [
      "Given a dataset too large to fit in memory, how would you compute per-group aggregations efficiently? Describe your approach and the tools you'd reach for.",
      "Describe how you'd build a feature pipeline that produces identical transformations at training and serving time to avoid train/serve skew.",
    ],
    systemDesign:
      "Design an end-to-end ML platform: data ingestion, a feature store, training, a model registry, deployment, and monitoring. What are the key trade-offs?",
  },
  "Cloud Architect": {
    technical: [
      "How do you design a secure, well-architected multi-account cloud environment? Cover networking, IAM boundaries, and guardrails.",
      "Explain your approach to infrastructure as code with Terraform at scale — module design, state management, and handling drift.",
      "How do you optimize cloud cost without sacrificing reliability? Give concrete levers you've actually used.",
    ],
    coding: [
      "Describe how you'd write Terraform (or pseudo-code) to provision an autoscaling, load-balanced web tier across multiple availability zones.",
      "How would you script the safe detection and cleanup of unused or orphaned cloud resources across many accounts?",
    ],
    systemDesign:
      "Design a globally distributed, fault-tolerant architecture for a SaaS product with strict uptime requirements. Cover regions, data residency, and failover.",
  },
  "Product Manager (Technical)": {
    technical: [
      "How do you translate an ambiguous business goal into a technical roadmap? Walk me through how you scope an MVP and sequence delivery.",
      "Describe how you work with engineering on technical trade-offs — for example build vs. buy, or taking on tech debt to hit a deadline.",
      "How do you define and instrument success metrics for a feature, and how do you decide whether to iterate on it or kill it?",
    ],
    coding: [
      "You're given raw funnel event data (view → signup → purchase). Describe how you'd structure an analysis to find the biggest drop-off and quantify the opportunity.",
      "Walk me through how you'd specify an API contract for a new feature so that engineering and external partners can build against it unambiguously.",
    ],
    systemDesign:
      "A key feature is being adopted far faster than expected and is starting to strain the system. Walk me through how you'd prioritize, communicate the trade-offs, and plan the scaling work with engineering.",
  },
  "Full-Stack Developer": {
    technical: [
      "Walk me through how you'd build a feature end-to-end — from database schema to API to UI. Where do you put business logic and why?",
      "How do you handle authentication and authorization across the stack securely — sessions vs. tokens, protecting APIs, and the frontend?",
      "How do you approach performance across the whole stack — database queries, API latency, and frontend rendering?",
    ],
    coding: [
      "Describe how you'd implement optimistic UI updates with proper rollback when the server mutation fails.",
      "Given a slow page that makes many sequential API calls, how would you diagnose it and restructure it to load efficiently?",
    ],
    systemDesign:
      "Design a real-time collaborative to-do app where multiple users see live updates. Cover the data model, the sync strategy, and conflict handling.",
  },
  "Backend Engineer (Node.js / Python)": {
    technical: [
      "How do you design clean, versioned REST or RPC APIs? Cover error handling, pagination, and backward compatibility.",
      "Explain how you'd handle a high-throughput write workload — connection pooling, batching, queues, and back-pressure.",
      "How do you ensure data consistency across services — transactions, idempotency, and handling partial failures?",
    ],
    coding: [
      "Describe how you'd implement a rate limiter for an API. Which algorithm and data structures would you use, and what edge cases matter?",
      "Given a list of jobs with dependencies, how would you determine a valid execution order? Discuss the algorithm and its complexity.",
    ],
    systemDesign:
      "Design a scalable background job processing system: queueing, workers, retries, dead-letter handling, and observability.",
  },
  "Frontend Engineer (React)": {
    technical: [
      "How do you diagnose and fix performance problems in a large React app — unnecessary re-renders, bundle size, and slow interactions?",
      "Explain your approach to component architecture and state management as an app grows. When do you reach for context, a store, or server-state caching?",
      "How do you build accessible and responsive components, and how do you actually verify accessibility?",
    ],
    coding: [
      "Describe how you'd implement a debounced, cancelable search-as-you-type input that avoids race conditions between responses.",
      "How would you build a virtualized list to render tens of thousands of rows smoothly? What's the core idea behind it?",
    ],
    systemDesign:
      "Design the frontend architecture for a large dashboard product: routing, data fetching and caching, code splitting, and a shared component system.",
  },
  "AI / LLM Engineer": {
    technical: [
      "Walk me through how you'd design a RAG pipeline: chunking, embeddings, retrieval, and how you'd evaluate and improve answer quality.",
      "How do you reduce hallucinations and measure the quality of an LLM feature in production? What evals and guardrails do you put in place?",
      "Explain the trade-offs between prompt engineering, fine-tuning, and retrieval when adapting a model to a specific domain.",
    ],
    coding: [
      "Describe how you'd implement chunking and retrieval over a large document corpus efficiently, including overlap handling and metadata filtering.",
      "How would you build a robust LLM call wrapper with retries, timeouts, streaming, and structured-output validation?",
    ],
    systemDesign:
      "Design a production LLM application platform: prompt and version management, caching, evaluation, monitoring, and cost control.",
  },
  "Mobile Developer (iOS/Android)": {
    technical: [
      "How do you architect a mobile app for testability and maintainability (e.g. MVVM or clean architecture)? Walk me through your layering.",
      "How do you handle offline-first behavior and data sync between the device and the backend, including conflict resolution?",
      "How do you diagnose and improve mobile performance — startup time, UI jank, memory, and battery?",
    ],
    coding: [
      "Describe how you'd implement smooth infinite scrolling with image loading and caching in a list, while avoiding memory spikes.",
      "How would you implement a reliable retry/queue mechanism for actions a user takes while the device is offline?",
    ],
    systemDesign:
      "Design the architecture for a mobile app with real-time messaging and push notifications. Cover sync, offline support, and the backend contract.",
  },
  "Database Administrator": {
    technical: [
      "Walk me through how you diagnose and optimize a slow query — reading the execution plan, indexing strategy, and the trade-offs involved.",
      "How do you design a schema for both integrity and performance? When do you denormalize, and how do you manage the consequences?",
      "Explain your approach to high availability and disaster recovery — replication, backups, RPO/RTO targets, and failover testing.",
    ],
    coding: [
      "Given a reporting query that joins several large tables and runs slowly, describe how you'd rewrite or index it and how you'd verify the improvement.",
      "How would you perform a safe, online schema migration on a very large table without significant downtime?",
    ],
    systemDesign:
      "Design a database architecture for a read-heavy application with global users: replication, caching, sharding, and consistency trade-offs.",
  },
};

function getDefaultQuestionSet(role: string): RoleQuestionSet {
  return {
    technical: [
      `Describe the most complex system you've designed as a ${role}. What were the key technical decisions and trade-offs?`,
      `How do you approach performance optimization in your ${role} work? Give a concrete example with measurable impact.`,
      `What strategies do you use to ensure code quality and reliability in production systems as a ${role}?`,
    ],
    coding: [
      `Given an array of integers, walk me through how you would find the two numbers that add up to a target value. Discuss time and space complexity.`,
      `Describe how you would implement a rate limiter for an API. What data structures and edge cases would you consider?`,
    ],
    systemDesign: `Walk me through how you would design a scalable, fault-tolerant system for 10M+ daily active users.`,
  };
}

function getFallbackQuestions(role: string): GeneratedQuestion[] {
  const set = ROLE_QUESTION_BANK[role] ?? getDefaultQuestionSet(role);
  // Same 2 soft / 3 technical / 2 coding / 1 system_design mix the AI prompt asks
  // for, ordered to open with a soft-skill question to ease the candidate in.
  const ordered: Array<{ questionText: string; questionType: QuestionType }> = [
    { questionText: SOFT_SKILL_QUESTIONS[0], questionType: "soft_skill" },
    { questionText: set.technical[0], questionType: "technical" },
    { questionText: set.coding[0], questionType: "coding" },
    { questionText: set.technical[1], questionType: "technical" },
    { questionText: set.systemDesign, questionType: "system_design" },
    { questionText: set.coding[1], questionType: "coding" },
    { questionText: SOFT_SKILL_QUESTIONS[1], questionType: "soft_skill" },
    { questionText: set.technical[2], questionType: "technical" },
  ];
  return ordered.map((q, i) => ({ ...q, orderIndex: i }));
}
