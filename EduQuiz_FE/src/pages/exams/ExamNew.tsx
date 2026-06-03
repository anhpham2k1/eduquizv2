import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, FileText, Save, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "../../api/client";
import type { Question } from "../../types";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";

function isSupportedQuestionFile(file: File) {
  const normalizedName = file.name.toLowerCase();
  return normalizedName.endsWith(".docx") || normalizedName.endsWith(".txt");
}

export default function ExamNew() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationMin, setDurationMin] = useState("60");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsedQuestions, setParsedQuestions] = useState<Question[]>([]);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const parseMutation = useMutation({
    mutationFn: (questionFile: File) => apiClient.parseExamFile(questionFile),
    onSuccess: (result, questionFile) => {
      setFile(questionFile);
      setParsedQuestions(result.questions);
      setError("");

      if (!title.trim()) {
        setTitle(result.titleSuggestion);
      }
    },
    onError: (mutationError) => {
      setParsedQuestions([]);
      setError(mutationError instanceof Error ? mutationError.message : "Không thể phân tích file");
    },
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      apiClient.createExam({
        title: title.trim(),
        description: description.trim() || undefined,
        durationMin: parseInt(durationMin, 10) || 60,
        questions: parsedQuestions.map((question, index) => ({
          no: index + 1,
          content: question.content,
          choices: question.choices,
          correctKey: question.correctKey,
          explanation: question.explanation,
        })),
      }),
    onSuccess: (exam) => {
      toast.success("Đã tạo đề thi thành công");
      queryClient.invalidateQueries({ queryKey: ["dashboard", "exams"] });
      navigate(`/exams/${exam.id}`);
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "Không thể tạo đề thi");
    },
  });

  const handleIncomingFile = (nextFile: File) => {
    if (!isSupportedQuestionFile(nextFile)) {
      setError("Chỉ hỗ trợ file .docx hoặc .txt");
      return;
    }

    setError("");
    parseMutation.mutate(nextFile);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);

    const droppedFile = event.dataTransfer.files?.[0];
    if (droppedFile) {
      handleIncomingFile(droppedFile);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      handleIncomingFile(selectedFile);
    }
  };

  const handleQuestionChange = <K extends keyof Question>(index: number, field: K, value: Question[K]) => {
    setParsedQuestions((currentQuestions) =>
      currentQuestions.map((question, questionIndex) =>
        questionIndex === index ? { ...question, [field]: value } : question,
      ),
    );
  };

  const handleChoiceChange = (questionIndex: number, choiceIndex: number, text: string) => {
    setParsedQuestions((currentQuestions) =>
      currentQuestions.map((question, currentQuestionIndex) => {
        if (currentQuestionIndex !== questionIndex) {
          return question;
        }

        return {
          ...question,
          choices: question.choices.map((choice, currentChoiceIndex) =>
            currentChoiceIndex === choiceIndex ? { ...choice, text } : choice,
          ),
        };
      }),
    );
  };

  const handleSave = () => {
    if (!title.trim()) {
      setError("Vui lòng nhập tiêu đề đề thi");
      return;
    }

    if (!parsedQuestions.length) {
      setError("Vui lòng tải lên file câu hỏi trước khi lưu");
      return;
    }

    saveMutation.mutate();
  };//

  const isBusy = parseMutation.isPending || saveMutation.isPending;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tạo đề thi mới</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tải file, xem trước câu hỏi rồi mới lưu vào hệ thống.
          </p>
        </div>
        {parsedQuestions.length > 0 ? (
          <Button onClick={handleSave} disabled={isBusy}>
            <Save className="mr-2 h-4 w-4" /> {saveMutation.isPending ? "Đang lưu..." : "Lưu đề thi"}
          </Button>
        ) : null}
      </div>

      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Thông tin chung</CardTitle>
            <CardDescription>
              Nhập tiêu đề và tải lên file Word hoặc TXT chứa câu hỏi trắc nghiệm.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">
                    Tiêu đề đề thi <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="VD: Đề thi thử THPT Quốc gia môn Toán"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="durationMin">
                    Thời gian làm bài (phút) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="durationMin"
                    type="number"
                    min="1"
                    placeholder="VD: 60"
                    value={durationMin}
                    onChange={(event) => setDurationMin(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Mô tả</Label>
                  <Textarea
                    id="description"
                    placeholder="Mô tả ngắn về đề thi..."
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>File câu hỏi (.docx hoặc .txt)</Label>
              <div
                className={`rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50"
                } ${file ? "bg-muted/30" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".docx,.txt"
                  onChange={handleFileChange}
                />

                {file ? (
                  <div className="flex flex-col items-center">
                    <FileText className="mb-4 h-12 w-12 text-primary" />
                    <p className="font-medium">{file.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={(event) => {
                        event.stopPropagation();
                        setFile(null);
                        setParsedQuestions([]);
                        setError("");
                      }}
                    >
                      Chọn file khác
                    </Button>
                  </div>
                ) : (
                  <div className="flex cursor-pointer flex-col items-center">
                    <UploadCloud className="mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="mb-1 text-lg font-medium">Kéo thả file vào đây</p>
                    <p className="mb-4 text-sm text-muted-foreground">
                      hoặc click để chọn file Word/TXT
                    </p>
                    <Button variant="secondary" size="sm">
                      Chọn file
                    </Button>
                  </div>
                )}
              </div>
              {error ? (
                <p className="mt-2 flex items-center text-sm text-destructive">
                  <AlertCircle className="mr-1 h-4 w-4" /> {error}
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {parseMutation.isPending && parsedQuestions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
              <p className="text-muted-foreground">Đang phân tích file câu hỏi...</p>
            </CardContent>
          </Card>
        ) : null}

        {parsedQuestions.length > 0 ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>Preview câu hỏi</CardTitle>
                  <CardDescription>Đã nhận diện {parsedQuestions.length} câu hỏi từ file</CardDescription>
                </div>
                <div className="flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-600 dark:bg-green-900/30">
                  <CheckCircle2 className="mr-1 h-4 w-4" /> Phân tích thành công
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {parsedQuestions.map((question, questionIndex) => (
                <div key={question.id ?? `question-${questionIndex}`} className="space-y-4 rounded-lg border bg-muted/20 p-4">
                  <div className="flex gap-2">
                    <span className="min-w-[3rem] pt-2 font-bold">Câu {questionIndex + 1}:</span>
                    <div className="flex-1 space-y-4">
                      <Textarea
                        value={question.content}
                        onChange={(event) =>
                          handleQuestionChange(questionIndex, "content", event.target.value)
                        }
                        className="min-h-[60px] font-medium"
                      />

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {question.choices.map((choice, choiceIndex) => (
                          <div
                            key={choice.key}
                            className={`flex items-center gap-2 rounded border p-2 ${
                              question.correctKey === choice.key
                                ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                                : "border-transparent"
                            }`}
                          >
                            <button
                              type="button"
                              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                                question.correctKey === choice.key
                                  ? "bg-green-500 text-white"
                                  : "bg-muted text-muted-foreground hover:bg-muted-foreground/20"
                              }`}
                              onClick={() => handleQuestionChange(questionIndex, "correctKey", choice.key)}
                              title="Chọn đáp án đúng"
                            >
                              {choice.key}
                            </button>
                            <Input
                              value={choice.text}
                              onChange={(event) =>
                                handleChoiceChange(questionIndex, choiceIndex, event.target.value)
                              }
                              className="h-8 text-sm"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="pt-2">
                        <Label className="mb-1 block text-xs text-muted-foreground">
                          Giải thích đáp án (hiện khi xem kết quả)
                        </Label>
                        <Textarea
                          value={question.explanation || ""}
                          onChange={(event) =>
                            handleQuestionChange(questionIndex, "explanation", event.target.value)
                          }
                          className="min-h-[40px] bg-muted/30 text-sm"
                          placeholder="Nhập giải thích chi tiết..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
