import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Bookmark,
  CheckCircle2,
  Clock,
  Eye,
  Filter,
  RotateCcw,
  Trophy,
  XCircle,
} from "lucide-react";
import { apiClient } from "../../api/client";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../components/ui/card";
import { cn } from "../../lib/utils";

export default function AttemptResult() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [filter, setFilter] = useState<"ALL" | "CORRECT" | "WRONG" | "SKIPPED" | "BOOKMARKED">("ALL");

  const retryResult = location.state?.retryResult as { 
    answers: Record<string, { selectedKey?: string, isCorrect?: boolean }>, 
    activeQuestionIds: string[] 
  } | undefined;
  const isRetryView = Boolean(retryResult);

  const resultQuery = useQuery({
    queryKey: ["attempt-result", attemptId],
    enabled: Boolean(attemptId),
    queryFn: () => apiClient.getAttemptResult(attemptId!),
  });

  if (resultQuery.isLoading) {
    return <div className="container mx-auto px-4 py-8 text-center">Đang tải kết quả...</div>;
  }

  if (resultQuery.isError || !resultQuery.data) {
    return (
      <div className="container mx-auto px-4 py-8 text-center text-destructive">
        Không tìm thấy kết quả
      </div>
    );
  }

  const { attempt, exam, questions } = resultQuery.data;

  let correctCount = 0;
  let skippedCount = 0;
  let wrongCount = 0;
  let totalQuestions = 1;
  let filteredQuestions = [];

  // Determine which answers to use (original vs retry session)
  const getAnswerForQuestion = (questionId: string) => {
    if (isRetryView && retryResult) {
      return retryResult.answers[questionId]?.selectedKey;
    }
    return attempt.answers[questionId];
  };

  if (isRetryView && retryResult) {
    const activeQuestions = questions.filter(q => retryResult.activeQuestionIds.includes(q.id));
    totalQuestions = activeQuestions.length || 1;

    correctCount = activeQuestions.filter(q => getAnswerForQuestion(q.id) === q.correctKey).length;
    skippedCount = activeQuestions.filter(q => !getAnswerForQuestion(q.id)).length;
    wrongCount = activeQuestions.length - correctCount - skippedCount;

    filteredQuestions = activeQuestions.filter(q => {
      const answer = getAnswerForQuestion(q.id);
      const isCorrect = answer === q.correctKey;
      const isSkipped = !answer;
      const isBookmarked = attempt.bookmarks?.includes(q.id);

      if (filter === "CORRECT") return isCorrect;
      if (filter === "WRONG") return !isCorrect && !isSkipped;
      if (filter === "SKIPPED") return isSkipped;
      if (filter === "BOOKMARKED") return Boolean(isBookmarked);
      return true;
    });
  } else {
    totalQuestions = questions.length || 1;

    correctCount = questions.filter((question) => attempt.answers[question.id] === question.correctKey).length;
    skippedCount = questions.filter((question) => !attempt.answers[question.id]).length;
    wrongCount = questions.length - correctCount - skippedCount;

    filteredQuestions = questions.filter((question) => {
      const answer = attempt.answers[question.id];
      const isCorrect = answer === question.correctKey;
      const isSkipped = !answer;
      const isBookmarked = attempt.bookmarks?.includes(question.id);

      if (filter === "CORRECT") return isCorrect;
      if (filter === "WRONG") return !isCorrect && !isSkipped;
      if (filter === "SKIPPED") return isSkipped;
      if (filter === "BOOKMARKED") return Boolean(isBookmarked);
      return true;
    });
  }

  const score = Math.round((correctCount / totalQuestions) * 10);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes} phút ${remainingSeconds} giây`;
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <Card className="mb-8 overflow-hidden border-none shadow-lg">
        <div className="border-b bg-gradient-to-r from-primary/20 via-primary/10 to-transparent p-8 text-center">
          <Trophy className="mx-auto mb-4 h-16 w-16 text-primary" />
          <h1 className="mb-2 text-3xl font-bold">
            {isRetryView ? "Kết quả làm lại câu sai" : "Kết quả làm bài"}
          </h1>
          <p className="text-lg text-muted-foreground">{exam.title}</p>
        </div>

        <CardContent className="p-8">
          <div className="mb-8 grid grid-cols-2 gap-6 md:grid-cols-4">
            <div className="flex flex-col items-center rounded-2xl border bg-muted/30 p-4">
              <span className="mb-1 text-sm font-medium text-muted-foreground">Điểm số</span>
              <span className="text-4xl font-bold text-primary">
                {score}
                <span className="text-xl text-muted-foreground">/10</span>
              </span>
            </div>
            <div className="flex flex-col items-center rounded-2xl border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-900/20">
              <span className="mb-1 flex items-center text-sm font-medium text-green-700 dark:text-green-400">
                <CheckCircle2 className="mr-1 h-4 w-4" /> Đúng
              </span>
              <span className="text-3xl font-bold text-green-600 dark:text-green-500">{correctCount}</span>
            </div>
            <div className="flex flex-col items-center rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-900/20">
              <span className="mb-1 flex items-center text-sm font-medium text-red-700 dark:text-red-400">
                <XCircle className="mr-1 h-4 w-4" /> Sai
              </span>
              <span className="text-3xl font-bold text-red-600 dark:text-red-500">{wrongCount}</span>
            </div>
            <div className="flex flex-col items-center rounded-2xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-900/20">
              <span className="mb-1 flex items-center text-sm font-medium text-orange-700 dark:text-orange-400">
                <AlertCircle className="mr-1 h-4 w-4" /> Bỏ qua
              </span>
              <span className="text-3xl font-bold text-orange-600 dark:text-orange-500">{skippedCount}</span>
            </div>
          </div>

          {!isRetryView && (
            <div className="flex items-center justify-center gap-2 rounded-lg bg-secondary/50 py-3 text-muted-foreground">
              <Clock className="h-5 w-5" />
              <span>
                Thời gian làm bài: <strong className="text-foreground">{formatTime(attempt.durationSec)}</strong>
              </span>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col justify-center gap-4 border-t bg-muted/10 p-6 sm:flex-row flex-wrap">
          {!isRetryView ? (
            <>
              <Button variant="outline" size="lg" className="w-full sm:w-auto" onClick={() => navigate(`/exams/${exam.id}`)}>
                <RotateCcw className="mr-2 h-5 w-5" /> Làm lại từ đầu
              </Button>
              {wrongCount > 0 ? (
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto"
                  onClick={() =>
                    navigate(`/attempts/${attempt.id}`, { state: { retryWrong: true, showAnswer: true } })
                  }
                >
                  <AlertCircle className="mr-2 h-5 w-5" /> Làm lại câu sai
                </Button>
              ) : null}
            </>
          ) : (
            <>
              {wrongCount > 0 ? (
                <Button
                  variant="default"
                  size="lg"
                  className="w-full sm:w-auto"
                  onClick={() =>
                    // Truyền thêm cờ để Attempt.tsx có thể nhận biết nên lấy các câu sai từ đợt này hay đợt trước
                    // Nhưng thực tế "Làm lại câu sai" luôn lấy từ data.attempt.answers trừ khi ta override nó.
                    // Để đơn giản, ta có thể cho phép retry tiếp đợt sai mới bằng cách update Attempt.tsx, 
                    // nhưng hiện tại ta có thể lưu đợt sai này vào state để truyền đi.
                    navigate(`/attempts/${attempt.id}`, { 
                      state: { retryWrong: true, showAnswer: true, currentWrongIds: filteredQuestions.filter(q => getAnswerForQuestion(q.id) !== q.correctKey).map(q => q.id) } 
                    })
                  }
                >
                  <AlertCircle className="mr-2 h-5 w-5" /> Làm lại các câu sai đợt này
                </Button>
              ) : null}
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto"
                onClick={() =>
                  navigate(`/attempts/${attempt.id}`, { state: { retryWrong: true, showAnswer: true } })
                }
              >
                <RotateCcw className="mr-2 h-5 w-5" /> Làm lại toàn bộ câu sai lúc trước
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="w-full sm:w-auto" 
                onClick={() => navigate(`/attempts/${attempt.id}/result`, { replace: true })}
              >
                <Eye className="mr-2 h-5 w-5" /> Xem kết quả gốc
              </Button>
            </>
          )}
          
          <Button size="lg" className="w-full sm:w-auto" onClick={() => navigate("/dashboard")}>
            Về Dashboard
          </Button>
        </CardFooter>
      </Card>

      <div className="space-y-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <h2 className="text-2xl font-bold">Chi tiết bài làm</h2>
          <div className="flex flex-wrap gap-2">
            <Button variant={filter === "ALL" ? "default" : "outline"} size="sm" onClick={() => setFilter("ALL")}>
              Tất cả
            </Button>
            <Button
              variant={filter === "CORRECT" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("CORRECT")}
              className="border-green-200 text-green-600 hover:bg-green-50"
            >
              Đúng
            </Button>
            <Button
              variant={filter === "WRONG" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("WRONG")}
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              Sai
            </Button>
            <Button
              variant={filter === "SKIPPED" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("SKIPPED")}
              className="border-orange-200 text-orange-600 hover:bg-orange-50"
            >
              Bỏ qua
            </Button>
            <Button
              variant={filter === "BOOKMARKED" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("BOOKMARKED")}
              className="border-yellow-200 text-yellow-600 hover:bg-yellow-50"
            >
              <Bookmark className="mr-1 h-4 w-4" /> Đã lưu
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {filteredQuestions.map((question) => {
            const answer = getAnswerForQuestion(question.id);
            const isCorrect = answer === question.correctKey;
            const isSkipped = !answer;
            const isBookmarked = attempt.bookmarks?.includes(question.id);

            return (
              <Card
                key={question.id}
                className={cn(
                  "overflow-hidden border-l-4",
                  isCorrect ? "border-l-green-500" : isSkipped ? "border-l-orange-500" : "border-l-red-500",
                )}
              >
                <CardHeader className="bg-muted/5 pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={isCorrect ? "default" : isSkipped ? "secondary" : "destructive"}
                        className={cn(isCorrect && "bg-green-500 hover:bg-green-600")}
                      >
                        {isCorrect ? "Đúng" : isSkipped ? "Bỏ qua" : "Sai"}
                      </Badge>
                      <span className="text-lg font-bold">Câu {question.no}</span>
                      {isBookmarked ? <Bookmark className="h-4 w-4 fill-current text-yellow-500" /> : null}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <p className="text-lg font-medium">{question.content}</p>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {question.choices.map((choice) => {
                      const isSelected = answer === choice.key;
                      const isKeyCorrect = question.correctKey === choice.key;

                      let style = "border-muted bg-background";
                      if (isKeyCorrect) {
                        style = "border-green-500 bg-green-50 font-medium dark:bg-green-900/20";
                      } else if (isSelected) {
                        style = "border-red-500 bg-red-50 dark:bg-red-900/20";
                      }

                      return (
                        <div key={choice.key} className={cn("flex items-center rounded-lg border p-3", style)}>
                          <div
                            className={cn(
                              "mr-3 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                              isKeyCorrect
                                ? "bg-green-500 text-white"
                                : isSelected
                                  ? "bg-red-500 text-white"
                                  : "bg-muted text-muted-foreground",
                            )}
                          >
                            {choice.key}
                          </div>
                          <span>{choice.text}</span>
                          {isKeyCorrect ? <CheckCircle2 className="ml-auto h-4 w-4 text-green-600" /> : null}
                          {isSelected && !isKeyCorrect ? (
                            <XCircle className="ml-auto h-4 w-4 text-red-600" />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  {question.explanation ? (
                    <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm dark:border-blue-900 dark:bg-blue-900/20">
                      <p className="mb-1 flex items-center font-semibold text-blue-700 dark:text-blue-400">
                        <AlertCircle className="mr-2 h-4 w-4" /> Giải thích:
                      </p>
                      <p className="text-blue-900 dark:text-blue-100">{question.explanation}</p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}

          {filteredQuestions.length === 0 ? (
            <div className="rounded-xl border border-dashed py-12 text-center">
              <Filter className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-medium">Không có câu hỏi nào</h3>
              <p className="text-muted-foreground">Thử thay đổi bộ lọc để xem kết quả.</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
