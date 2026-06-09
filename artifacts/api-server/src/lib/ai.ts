import OpenAI from "openai";
import { logger } from "./logger";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? "missing",
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

function getFallbackQuestions(role: string): GeneratedQuestion[] {
  return [
    { questionText: `To start, tell me about a time you had a disagreement with a teammate on a technical decision. How did you resolve it?`, questionType: "soft_skill", orderIndex: 0 },
    { questionText: `Describe the most complex system you've designed as a ${role}. What were the key technical decisions and trade-offs?`, questionType: "technical", orderIndex: 1 },
    { questionText: `Given an array of integers, walk me through how you would find the two numbers that add up to a target value. Discuss time and space complexity.`, questionType: "coding", orderIndex: 2 },
    { questionText: `How do you approach performance optimization in your ${role} work? Give a concrete example with measurable impact.`, questionType: "technical", orderIndex: 3 },
    { questionText: `Walk me through how you would design a scalable, fault-tolerant system for 10M+ daily active users.`, questionType: "system_design", orderIndex: 4 },
    { questionText: `Describe how you would implement a rate limiter for an API. What data structures and edge cases would you consider?`, questionType: "coding", orderIndex: 5 },
    { questionText: `How do you communicate complex technical concepts to non-technical stakeholders? Give an example.`, questionType: "soft_skill", orderIndex: 6 },
    { questionText: `What strategies do you use for ensuring code quality and reliability in production systems?`, questionType: "technical", orderIndex: 7 },
  ];
}
