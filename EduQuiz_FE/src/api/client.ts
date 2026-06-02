import type { Attempt, AttemptConfig, Exam, Question, User } from "../types";
import type { AuthSession } from "./http";
import { apiJson, apiNoContent } from "./http";

export const apiClient = {
  register(name: string, username: string, password: string) {
    return apiJson<AuthSession>("/api/auth/register", {
      method: "POST",
      body: { name, username, password },
    });
  },

  login(username: string, password: string) {
    return apiJson<AuthSession>("/api/auth/login", {
      method: "POST",
      body: { username, password },
    });
  },

  async getMe() {
    const data = await apiJson<{ user: User }>("/api/auth/me");
    return data.user;
  },

  getMyExams() {
    return apiJson<Exam[]>("/api/exams");
  },

  getAttemptHistory() {
    return apiJson<Attempt[]>("/api/attempts");
  },

  async parseExamFile(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    return apiJson<{ titleSuggestion: string; questions: Question[] }>("/api/exams/parse", {
      method: "POST",
      body: formData,
    });
  },

  createExam(data: {
    title: string;
    description?: string;
    questions: Array<Partial<Question>>;
  }) {
    return apiJson<Exam>("/api/exams", {
      method: "POST",
      body: data,
    });
  },

  getExam(examId: string) {
    return apiJson<{ exam: Exam; questions: Question[] }>(`/api/exams/${examId}`);
  },

  deleteExam(examId: string) {
    return apiNoContent(`/api/exams/${examId}`, { method: "DELETE" });
  },

  createAttempt(examId: string, config?: AttemptConfig) {
    return apiJson<Attempt>("/api/attempts", {
      method: "POST",
      body: { examId, config },
    });
  },

  saveAnswer(attemptId: string, questionId: string, choiceKey: "A" | "B" | "C" | "D" | "E" | "F") {
    return apiNoContent(`/api/attempts/${attemptId}/answer`, {
      method: "PUT",
      body: { questionId, choiceKey },
    });
  },

  submitAttempt(attemptId: string, bookmarks?: string[]) {
    return apiNoContent(`/api/attempts/${attemptId}/submit`, {
      method: "PUT",
      body: { bookmarks },
    });
  },

  getAttemptSession(attemptId: string) {
    return apiJson<{ attempt: Attempt; exam: Exam; questions: Question[] }>(`/api/attempts/${attemptId}/session`);
  },

  getAttemptResult(attemptId: string) {
    return apiJson<{ attempt: Attempt; exam: Exam; questions: Question[] }>(`/api/attempts/${attemptId}`);
  },
};
