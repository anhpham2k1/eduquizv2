import { useCallback, useEffect, useReducer, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  List,
  Settings,
  XCircle,
} from "lucide-react";
import { apiClient } from "../../api/client";
import type { Attempt as AttemptType, Exam, Question } from "../../types";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Checkbox } from "../../components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { attemptReducer, type AttemptState, type ChoiceKey } from "../../lib/attemptReducer";
import { cn } from "../../lib/utils";

function shuffleArray<T>(array: T[]) {
  const nextArray = [...array];
  for (let index = nextArray.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [nextArray[index], nextArray[randomIndex]] = [nextArray[randomIndex], nextArray[index]];
  }
  return nextArray;
}

function Timer({
  initialTime,
  onTimeUp,
  className,
}: {
  initialTime: number;
  onTimeUp: () => void;
  className?: string;
}) {
  const [timeLeft, setTimeLeft] = useState(initialTime);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeLeft((currentValue) => {
        if (currentValue <= 1) {
          window.clearInterval(timer);
          onTimeUp();
          return 0;
        }
        return currentValue - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [onTimeUp]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div
      className={cn(
        "font-mono font-bold tracking-tight",
        timeLeft < 300 ? "animate-pulse text-destructive" : "text-primary",
        className,
      )}
    >
      {`${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`}
    </div>
  );
}

function AttemptSettingsPanel({
  autoNextSec,
  onAutoNextChange,
  soundEnabled,
  onSoundChange,
  shuffleQuestions,
  shuffleAnswers,
}: {
  autoNextSec: number;
  onAutoNextChange: (value: number) => void;
  soundEnabled: boolean;
  onSoundChange: (value: boolean) => void;
  shuffleQuestions?: boolean;
  shuffleAnswers?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label className="text-xs">Tự động chuyển câu</Label>
        <Select value={autoNextSec.toString()} onValueChange={(value) => onAutoNextChange(Number(value))}>
          <SelectTrigger className="h-10 text-sm">
            <SelectValue placeholder="Chọn thời gian" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Off (Tắt)</SelectItem>
            {Array.from({ length: 10 }, (_, index) => index + 1).map((seconds) => (
              <SelectItem key={seconds} value={seconds.toString()}>
                {seconds} giây
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between rounded-xl border bg-muted/20 px-3 py-3">
        <Label className="cursor-pointer text-sm" htmlFor="sound-toggle">
          Âm thanh chọn đáp án
        </Label>
        <Checkbox
          id="sound-toggle"
          checked={soundEnabled}
          onCheckedChange={(checked) => onSoundChange(Boolean(checked))}
          className="h-4 w-4"
        />
      </div>

      <div className="space-y-3 rounded-xl border border-dashed bg-muted/10 p-3">
        <div className="flex items-center justify-between opacity-60">
          <Label className="text-sm">Đảo câu hỏi</Label>
          <Checkbox checked={shuffleQuestions} disabled />
        </div>
        <div className="flex items-center justify-between opacity-60">
          <Label className="text-sm">Đảo đáp án</Label>
          <Checkbox checked={shuffleAnswers} disabled />
        </div>
        <p className="text-xs text-muted-foreground">
          Hai tuỳ chọn này đã được khóa từ lúc bắt đầu làm bài.
        </p>
      </div>
    </div>
  );
}

function QuestionNavigator({
  state,
  questionsById,
  showAnswer,
  onSelectIndex,
}: {
  state: AttemptState;
  questionsById: Record<string, Question>;
  showAnswer: boolean;
  onSelectIndex: (index: number) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Mục lục câu hỏi</h3>
        <span className="rounded-full bg-secondary px-2 py-1 text-xs font-normal text-muted-foreground">
          {state.stats?.answeredCount || 0}/{state.activeQuestionIds.length}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {state.activeQuestionIds.map((questionId, index) => {
          const question = questionsById[questionId];
          if (!question) return null;

          const answer = state.answers[questionId];
          const isAnswered = answer?.locked;
          const isCurrent = index === state.activeIndex;

          let buttonClass = "border-muted bg-background text-muted-foreground hover:border-primary/50";
          if (isCurrent) {
            buttonClass = "border-primary ring-2 ring-primary/20 ring-offset-1";
          } else if (isAnswered) {
            if (showAnswer || state.mode === "review") {
              buttonClass = answer.isCorrect
                ? "border-green-500 bg-green-500 text-white"
                : "border-red-500 bg-red-500 text-white";
            } else {
              buttonClass = "border-primary bg-primary text-primary-foreground";
            }
          }

          return (
            <button
              type="button"
              key={questionId}
              onClick={() => onSelectIndex(index)}
              title={state.mode === "retryWrong" ? `Câu gốc: ${question.no}` : `Câu ${question.no}`}
              className={cn(
                "relative flex h-11 w-full items-center justify-center rounded-md border-2 text-sm font-medium transition-colors",
                buttonClass,
              )}
            >
              {state.mode === "retryWrong" ? index + 1 : question.no}
              {state.bookmarks?.includes(questionId) ? (
                <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border border-white bg-yellow-500" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function QuestionCard({
  currentQuestion,
  currentAnswer,
  showAnswer,
  isReview,
  isRetryWrong,
  currentIndex,
  totalQuestions,
  isBookmarked,
  onToggleBookmark,
  onSelectChoice,
  className,
}: {
  currentQuestion: Question;
  currentAnswer: AttemptState["answers"][string];
  showAnswer: boolean;
  isReview: boolean;
  isRetryWrong: boolean;
  currentIndex: number;
  totalQuestions: number;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  onSelectChoice: (choice: ChoiceKey) => void;
  className?: string;
}) {
  return (
    <Card className={cn("w-full border-none shadow-md", className)}>
      <CardHeader className="border-b px-4 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {isRetryWrong ? `Làm lại câu sai ${currentIndex + 1}/${totalQuestions}` : "Đang làm bài"}
            </p>
            <CardTitle className="text-xl font-bold text-primary sm:text-2xl">
              Câu {currentQuestion.no}
            </CardTitle>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              {currentAnswer?.locked ? "Đã trả lời" : "Chưa trả lời"}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-10 w-10", isBookmarked ? "text-yellow-500" : "text-muted-foreground")}
              onClick={onToggleBookmark}
              title="Đánh dấu câu hỏi"
            >
              <Bookmark className={cn("h-5 w-5", isBookmarked && "fill-current")} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-6 px-4 py-5 sm:px-6">
        <div className="text-base leading-7 sm:text-lg sm:leading-relaxed">{currentQuestion.content}</div>

        <div className="space-y-3">
          {currentQuestion.choices.map((choice) => {
            const isSelected = currentAnswer?.selectedKey === choice.key;
            const isCorrect = currentQuestion.correctKey === choice.key;
            const showStatus = (showAnswer && currentAnswer?.locked) || isReview;

            let borderClass = "border-muted hover:border-primary/50 hover:bg-muted/50";
            let badgeClass = "bg-muted text-muted-foreground";
            let textClass = "text-foreground/80";
            let icon = null;

            if (showStatus) {
              if (isCorrect) {
                borderClass = "border-green-500 bg-green-50 shadow-sm dark:bg-green-900/20";
                badgeClass = "bg-green-500 text-white";
                textClass = "font-medium text-green-700 dark:text-green-400";
                icon = <CheckCircle2 className="ml-auto h-5 w-5 text-green-500" />;
              } else if (isSelected) {
                borderClass = "border-red-500 bg-red-50 shadow-sm dark:bg-red-900/20";
                badgeClass = "bg-red-500 text-white";
                textClass = "font-medium text-red-700 dark:text-red-400";
                icon = <XCircle className="ml-auto h-5 w-5 text-red-500" />;
              }
            } else if (isSelected) {
              borderClass = "border-primary bg-primary/5 shadow-sm";
              badgeClass = "bg-primary text-primary-foreground";
              textClass = "font-medium text-foreground";
              icon = <CheckCircle2 className="ml-auto h-5 w-5 text-primary" />;
            }

            return (
              <button
                type="button"
                key={`${currentQuestion.id}-${choice.key}`}
                onClick={() => onSelectChoice(choice.key)}
                className={cn(
                  "flex w-full items-center rounded-2xl border-2 px-4 py-4 text-left transition-all duration-200",
                  borderClass,
                  currentAnswer?.locked || isReview ? "cursor-default opacity-90" : "cursor-pointer",
                )}
              >
                <div
                  className={cn(
                    "mr-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors",
                    badgeClass,
                  )}
                >
                  {choice.key}
                </div>
                <span className={cn("pr-2 text-base", textClass)}>{choice.text}</span>
                {icon}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function MobileSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="inset-x-0 bottom-0 top-auto left-0 w-full max-w-none translate-x-0 translate-y-0 gap-0 rounded-b-none rounded-t-3xl border-x-0 border-b-0 p-0 sm:max-w-none"
      >
        <div className="max-h-[82dvh] overflow-hidden">
          <div className="flex justify-center pt-3">
            <div className="h-1.5 w-14 rounded-full bg-muted-foreground/20" />
          </div>
          <DialogHeader className="border-b px-4 pb-4 pt-3 text-left">
            <div className="flex items-start justify-between gap-3">
              <div>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{description}</DialogDescription>
              </div>
              <DialogClose asChild>
                <Button variant="ghost" size="sm">
                  Đóng
                </Button>
              </DialogClose>
            </div>
          </DialogHeader>
          <div className="overflow-y-auto px-4 py-4">{children}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Attempt() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const timerRef = useRef<number | undefined>(undefined);

  const [attempt, setAttempt] = useState<AttemptType | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [autoNextSec, setAutoNextSec] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);
  const [mobileNavigatorOpen, setMobileNavigatorOpen] = useState(false);

  const isRetryWrong = Boolean(location.state?.retryWrong);
  const [state, dispatch] = useReducer(attemptReducer, {} as AttemptState);

  const handleSubmit = useCallback(async () => {
    if (!state.attemptId) {
      return;
    }

    try {
      localStorage.removeItem(`eduquiz_attempt_${attemptId}`);

      if (state.mode === "retryWrong") {
        navigate(`/attempts/${attemptId}/result`);
        return;
      }

      await apiClient.submitAttempt(state.attemptId, state.bookmarks);
      navigate(`/attempts/${state.attemptId}/result`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Không thể nộp bài");
    }
  }, [attemptId, navigate, state.attemptId, state.bookmarks, state.mode]);

  useEffect(() => {
    if (!attemptId) {
      return;
    }

    let isCancelled = false;
    const savedStateValue = localStorage.getItem(`eduquiz_attempt_${attemptId}`);

    const loadAttempt = async () => {
      setLoading(true);
      setError("");

      try {
        const data = isRetryWrong
          ? await apiClient.getAttemptResult(attemptId)
          : await apiClient.getAttemptSession(attemptId);

        if (isCancelled) {
          return;
        }

        setAttempt(data.attempt);
        setExam(data.exam);

        if (data.attempt.config) {
          setAutoNextSec(data.attempt.config.autoNextSec);
          setSoundEnabled(data.attempt.config.answerSound);
          setShowAnswer(data.attempt.config.mode === "PRACTICE");
        } else {
          setShowAnswer(Boolean(location.state?.showAnswer));
          setAutoNextSec(Number(location.state?.autoNext || 0));
        }

        const shouldShuffleAnswers = data.attempt.config?.shuffleAnswers ?? data.exam.shuffleAnswers;
        const shouldShuffleQuestions = data.attempt.config?.shuffleQuestions ?? data.exam.shuffleQuestions;

        let finalQuestions = [...data.questions];
        if (shouldShuffleAnswers && !savedStateValue) {
          finalQuestions = finalQuestions.map((question) => ({
            ...question,
            choices: shuffleArray(question.choices),
          }));
        }

        const correctMap: Record<string, ChoiceKey> = {};
        finalQuestions.forEach((question) => {
          if (question.correctKey) {
            correctMap[question.id] = question.correctKey;
          }
        });

        if (savedStateValue && !isRetryWrong) {
          try {
            const savedData = JSON.parse(savedStateValue);
            const shouldRestore = window.confirm(
              "Bạn có bài làm chưa hoàn thành. Bạn có muốn tiếp tục không?",
            );

            if (shouldRestore) {
              dispatch({ type: "RESTORE_ATTEMPT", payload: savedData.state || savedData });
              setQuestions(savedData.questions || finalQuestions);
              setLoading(false);
              return;
            }

            localStorage.removeItem(`eduquiz_attempt_${attemptId}`);
          } catch {
            localStorage.removeItem(`eduquiz_attempt_${attemptId}`);
          }
        }

        setQuestions(finalQuestions);

        if (isRetryWrong) {
          const wrongQuestionIds = finalQuestions
            .filter((question) => {
              const answer = data.attempt.answers?.[question.id];
              // Bao gồm cả câu trả lời sai và câu bị bỏ qua
              return !answer || (question.correctKey && answer !== question.correctKey);
            })
            .map((question) => question.id);

          const newAttemptId = typeof crypto !== "undefined" && crypto.randomUUID 
            ? crypto.randomUUID() 
            : `retry-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

          dispatch({
            type: "INIT_RETRY",
            payload: {
              attemptId: newAttemptId,
              examId: data.exam.id,
              wrongQuestionIds: shouldShuffleQuestions ? shuffleArray(wrongQuestionIds) : wrongQuestionIds,
              correctMap,
            },
          });
        } else {
          const questionIds = finalQuestions.map((question) => question.id);
          dispatch({
            type: "INIT_EXAM",
            payload: {
              attemptId: data.attempt.id,
              examId: data.exam.id,
              questionIds: shouldShuffleQuestions ? shuffleArray(questionIds) : questionIds,
              correctMap,
            },
          });
        }
      } catch (loadError) {
        if (!isCancelled) {
          setError(loadError instanceof Error ? loadError.message : "Không thể tải bài làm");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    loadAttempt();

    return () => {
      isCancelled = true;
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [attemptId, isRetryWrong, location.state?.autoNext, location.state?.showAnswer]);

  useEffect(() => {
    if (state.attemptId && state.mode === "exam") {
      const timeout = window.setTimeout(() => {
        localStorage.setItem(
          `eduquiz_attempt_${attemptId}`,
          JSON.stringify({
            state,
            questions,
          }),
        );
      }, 1000);

      return () => window.clearTimeout(timeout);
    }
  }, [attemptId, questions, state]);

  const handleSelect = useCallback(
    async (choice: ChoiceKey) => {
      if (!state.attemptId || !state.activeQuestionIds?.length) {
        return;
      }

      const questionId = state.activeQuestionIds[state.activeIndex];
      const currentAnswer = state.answers[questionId];

      if (currentAnswer?.locked || state.mode === "review") {
        return;
      }

      dispatch({ type: "SELECT_ANSWER", payload: { questionId, choice } });

      if (state.mode !== "retryWrong") {
        try {
          await apiClient.saveAnswer(state.attemptId, questionId, choice);
        } catch (saveError) {
          setError(saveError instanceof Error ? saveError.message : "Không thể lưu câu trả lời");
        }
      }

      if (soundEnabled) {
        console.log("Play answer sound");
      }

      if (autoNextSec > 0) {
        if (timerRef.current) {
          window.clearTimeout(timerRef.current);
        }

        timerRef.current = window.setTimeout(() => {
          dispatch({ type: "NEXT" });
        }, autoNextSec * 1000);
      }
    },
    [autoNextSec, soundEnabled, state.activeIndex, state.activeQuestionIds, state.answers, state.attemptId, state.mode],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        dispatch({ type: "NEXT" });
      }

      if (event.key === "ArrowLeft") {
        dispatch({ type: "PREV" });
      }

      if (["1", "2", "3", "4"].includes(event.key)) {
        const keys: ChoiceKey[] = ["A", "B", "C", "D"];
        const index = Number.parseInt(event.key, 10) - 1;
        handleSelect(keys[index]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSelect]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Đang tải...</div>;
  }

  if (error) {
    return <div className="flex min-h-screen items-center justify-center text-destructive">{error}</div>;
  }

  if (!questions.length || !state.activeQuestionIds?.length) {
    return <div className="flex min-h-screen items-center justify-center">Không có câu hỏi nào.</div>;
  }

  const questionsById = Object.fromEntries(questions.map((question) => [question.id, question])) as Record<
    string,
    Question
  >;
  const currentQuestionId = state.activeQuestionIds[state.activeIndex];
  const currentQuestion = questionsById[currentQuestionId];

  if (!currentQuestion) {
    return <div className="flex min-h-screen items-center justify-center">Không có câu hỏi nào.</div>;
  }

  const currentAnswer = state.answers[currentQuestion.id];
  const totalQuestions = state.activeQuestionIds.length;
  const answeredCount = state.stats?.answeredCount || 0;
  const modeLabel =
    state.mode === "retryWrong" ? "Làm lại câu sai" : attempt?.config?.mode === "EXAM" ? "Thi thật" : "Ôn tập";
  const shuffleQuestions = attempt?.config?.shuffleQuestions;
  const shuffleAnswers = attempt?.config?.shuffleAnswers;

  return (
    <div className="min-h-[100dvh] bg-muted/10 md:min-h-[calc(100dvh-3.5rem)] md:h-[calc(100dvh-3.5rem)] md:overflow-hidden">
      <div className="md:hidden">
        <div className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="flex min-w-0 flex-1 flex-wrap gap-2">
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                Câu {state.activeIndex + 1}/{totalQuestions}
              </span>
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                {answeredCount}/{totalQuestions} đã trả lời
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-2 shadow-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Timer initialTime={3600} onTimeUp={handleSubmit} className="text-base" />
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full"
                onClick={() => setMobileSettingsOpen(true)}
                title="Cài đặt"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="px-3 py-3">
          <QuestionCard
            currentQuestion={currentQuestion}
            currentAnswer={currentAnswer}
            showAnswer={showAnswer}
            isReview={state.mode === "review"}
            isRetryWrong={state.mode === "retryWrong"}
            currentIndex={state.activeIndex}
            totalQuestions={totalQuestions}
            isBookmarked={state.bookmarks?.includes(currentQuestion.id)}
            onToggleBookmark={() =>
              dispatch({ type: "TOGGLE_BOOKMARK", payload: { questionId: currentQuestion.id } })
            }
            onSelectChoice={handleSelect}
          />
        </div>

        <div className="sticky bottom-0 z-30 border-t bg-background/95 backdrop-blur">
          <div className="space-y-2 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-2">
              <Button
                variant="outline"
                onClick={() => dispatch({ type: "PREV" })}
                disabled={state.activeIndex === 0}
              >
                <ChevronLeft className="mr-1 h-4 w-4" /> Trước
              </Button>
              <Button variant="outline" size="icon" onClick={() => setMobileNavigatorOpen(true)}>
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => dispatch({ type: "NEXT" })}
                disabled={state.activeIndex === totalQuestions - 1}
              >
                Sau <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
            <Button className="w-full" onClick={handleSubmit}>
              Nộp bài
            </Button>
          </div>
        </div>

        <MobileSheet
          open={mobileSettingsOpen}
          onOpenChange={setMobileSettingsOpen}
          title="Cài đặt"
          description="Tùy chỉnh những gì vẫn có thể thay đổi trong lúc làm bài."
        >
          <AttemptSettingsPanel
            autoNextSec={autoNextSec}
            onAutoNextChange={setAutoNextSec}
            soundEnabled={soundEnabled}
            onSoundChange={setSoundEnabled}
            shuffleQuestions={shuffleQuestions}
            shuffleAnswers={shuffleAnswers}
          />
        </MobileSheet>

        <MobileSheet
          open={mobileNavigatorOpen}
          onOpenChange={setMobileNavigatorOpen}
          title="Mục lục câu hỏi"
          description="Chạm vào số câu để chuyển nhanh."
        >
          <QuestionNavigator
            state={state}
            questionsById={questionsById}
            showAnswer={showAnswer}
            onSelectIndex={(index) => {
              dispatch({ type: "GO_TO", payload: { index } });
              setMobileNavigatorOpen(false);
            }}
          />
        </MobileSheet>
      </div>

      <div className="hidden h-[calc(100dvh-3.5rem)] md:flex">
        <div className="flex w-64 flex-col gap-6 overflow-y-auto border-r bg-card p-4">
          <div className="flex items-center gap-3 border-b pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
              U
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{exam?.title || "Người dùng"}</p>
              <p className="text-xs text-muted-foreground">Chế độ: {modeLabel}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="mb-1 flex items-center justify-between text-sm font-medium text-muted-foreground">
              <span className="flex items-center">
                <Clock className="mr-1 h-4 w-4" /> Thời gian còn lại
              </span>
            </div>
            <Timer initialTime={3600} onTimeUp={handleSubmit} className="text-3xl" />
          </div>

          <div className="space-y-4 border-t pt-4">
            <h3 className="flex items-center text-sm font-medium">
              <Settings className="mr-2 h-4 w-4" /> Cài đặt
            </h3>
            <AttemptSettingsPanel
              autoNextSec={autoNextSec}
              onAutoNextChange={setAutoNextSec}
              soundEnabled={soundEnabled}
              onSoundChange={setSoundEnabled}
              shuffleQuestions={shuffleQuestions}
              shuffleAnswers={shuffleAnswers}
            />
          </div>

          <div className="mt-auto flex flex-col gap-2 border-t pt-4">
            <Button variant="outline" className="w-full" onClick={() => navigate("/dashboard")}>
              Trở về
            </Button>
            <Button variant="default" className="w-full" onClick={handleSubmit}>
              Nộp bài
            </Button>
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto p-6 lg:p-8">
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center">
            <QuestionCard
              currentQuestion={currentQuestion}
              currentAnswer={currentAnswer}
              showAnswer={showAnswer}
              isReview={state.mode === "review"}
              isRetryWrong={state.mode === "retryWrong"}
              currentIndex={state.activeIndex}
              totalQuestions={totalQuestions}
              isBookmarked={state.bookmarks?.includes(currentQuestion.id)}
              onToggleBookmark={() =>
                dispatch({ type: "TOGGLE_BOOKMARK", payload: { questionId: currentQuestion.id } })
              }
              onSelectChoice={handleSelect}
              className="flex-1"
            />
          </div>
        </div>

        <div className="flex w-72 flex-col border-l bg-card p-4">
          <div className="flex-1 overflow-y-auto pr-1">
            <QuestionNavigator
              state={state}
              questionsById={questionsById}
              showAnswer={showAnswer}
              onSelectIndex={(index) => dispatch({ type: "GO_TO", payload: { index } })}
            />
          </div>

          <div className="mt-auto flex gap-2 border-t pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => dispatch({ type: "PREV" })}
              disabled={state.activeIndex === 0}
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Trước
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => dispatch({ type: "NEXT" })}
              disabled={state.activeIndex === totalQuestions - 1}
            >
              Sau <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
