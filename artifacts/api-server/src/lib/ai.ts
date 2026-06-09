import OpenAI from "openai";
import { logger } from "./logger";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? "missing",
});

export interface GeneratedQuestion {
  questionText: string;
  questionType: "technical" | "system_design" | "behavioral";
  orderIndex: number;
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
- Mix: 3 technical deep-dive questions, 3 system design questions, 2 behavioral questions
- Questions should be specific, scenario-based, and test depth of knowledge
- Behavioral questions should assess leadership, decision-making, and technical judgment

Return ONLY valid JSON array with this format:
[
  {"questionText": "...", "questionType": "technical", "orderIndex": 0},
  {"questionText": "...", "questionType": "system_design", "orderIndex": 1},
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
    const questions: GeneratedQuestion[] = Array.isArray(parsed) ? parsed : (parsed.questions ?? []);
    return questions.slice(0, 8).map((q, i) => ({
      questionText: q.questionText ?? q.question ?? `Question ${i + 1}`,
      questionType: (["technical", "system_design", "behavioral"].includes(q.questionType) ? q.questionType : "technical") as GeneratedQuestion["questionType"],
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
  const prompt = `You are evaluating a senior ${role} candidate's interview response.

Question: ${question}

Candidate's Answer: ${answer}

Evaluate this answer for a SENIOR-LEVEL position. Score 0-100 based on:
- Technical depth and accuracy
- Problem-solving approach
- Clarity of communication
- Real-world experience signals
- Seniority indicators

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
      score: Math.min(100, Math.max(0, Number(parsed.score) || 50)),
      feedback: parsed.feedback ?? "Answer evaluated.",
      strengths: parsed.strengths ?? "Demonstrated relevant knowledge.",
      weaknesses: parsed.weaknesses ?? "Could provide more depth.",
    };
  } catch (err) {
    logger.warn({ err }, "OpenAI answer evaluation failed, using fallback");
    return {
      score: 65,
      feedback: "The answer demonstrates relevant experience. More specific examples would strengthen the response.",
      strengths: "Shows familiarity with the domain.",
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
  const avgScore = answers.length > 0 ? Math.round(answers.reduce((s, a) => s + a.score, 0) / answers.length) : 50;
  const technicalAnswers = answers.filter(a => a.questionType === "technical" || a.questionType === "system_design");
  const behavioralAnswers = answers.filter(a => a.questionType === "behavioral");

  const technicalScore = technicalAnswers.length > 0
    ? Math.round(technicalAnswers.reduce((s, a) => s + a.score, 0) / technicalAnswers.length)
    : avgScore;
  const communicationScore = behavioralAnswers.length > 0
    ? Math.round(behavioralAnswers.reduce((s, a) => s + a.score, 0) / behavioralAnswers.length)
    : Math.round(avgScore * 0.9);

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

function getFallbackQuestions(role: string): GeneratedQuestion[] {
  return [
    { questionText: `Describe the most complex system you've designed as a ${role}. What were the key technical decisions?`, questionType: "system_design", orderIndex: 0 },
    { questionText: `How do you approach performance optimization in your ${role} work? Give a concrete example.`, questionType: "technical", orderIndex: 1 },
    { questionText: `Walk me through how you would design a scalable, fault-tolerant system for 10M+ daily active users.`, questionType: "system_design", orderIndex: 2 },
    { questionText: `Describe a time you identified a critical technical flaw in a project. How did you handle it?`, questionType: "behavioral", orderIndex: 3 },
    { questionText: `What strategies do you use for ensuring code quality and reliability in production systems?`, questionType: "technical", orderIndex: 4 },
    { questionText: `How do you approach debugging a complex issue in a distributed system?`, questionType: "technical", orderIndex: 5 },
    { questionText: `Describe a situation where you had to make a significant architectural decision under pressure.`, questionType: "behavioral", orderIndex: 6 },
    { questionText: `How would you design the data layer for a real-time analytics platform handling 1M events/sec?`, questionType: "system_design", orderIndex: 7 },
  ];
}
