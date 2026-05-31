export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
  hasPassword?: boolean;
  provider?: "LOCAL";
  emailVerified?: boolean;
  pendingEmail?: string;
}

export interface Exam {
  id: string;
  title: string;
  description?: string;
  questionCount: number;
  createdAt: string;
  ownerId: string;
  shuffleQuestions?: boolean;
  shuffleAnswers?: boolean;
}

export interface Choice {
  key: "A" | "B" | "C" | "D";
  text: string;
}

export interface Question {
  id: string;
  no: number;
  content: string;
  imageUrl?: string;
  choices: Choice[];
  correctKey?: "A" | "B" | "C" | "D";
  explanation?: string;
}

export interface AttemptConfig {
  mode: "PRACTICE" | "EXAM";
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  autoNextSec: number;
  answerSound: boolean;
}

export interface Attempt {
  id: string;
  examId: string;
  startedAt: string;
  finishedAt?: string;
  durationSec: number;
  answers: Record<string, "A" | "B" | "C" | "D">;
  bookmarks?: string[];
  config?: AttemptConfig;
  examTitle?: string;
}
