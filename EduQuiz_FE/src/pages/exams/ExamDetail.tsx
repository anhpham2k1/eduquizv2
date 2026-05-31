import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Clock, Download, FileText, Play } from "lucide-react";
import { apiClient } from "../../api/client";
import type { AttemptConfig } from "../../types";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../components/ui/card";
import { Checkbox } from "../../components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";

export default function ExamDetail() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [config, setConfig] = useState<AttemptConfig>({
    mode: "PRACTICE",
    shuffleQuestions: false,
    shuffleAnswers: false,
    autoNextSec: 0,
    answerSound: false,
  });

  const examQuery = useQuery({
    queryKey: ["exam", examId],
    enabled: Boolean(examId),
    queryFn: () => apiClient.getExam(examId!),
  });

  const startAttemptMutation = useMutation({
    mutationFn: () => apiClient.createAttempt(examId!, config),
    onSuccess: (attempt) => {
      navigate(`/attempts/${attempt.id}`);
    },
  });

  const exam = examQuery.data?.exam;

  if (examQuery.isLoading) {
    return <div className="container mx-auto px-4 py-8">Đang tải...</div>;
  }

  if (examQuery.isError || !exam) {
    return <div className="container mx-auto px-4 py-8">Không tìm thấy đề thi</div>;
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Card className="mb-8 overflow-hidden border-none shadow-md">
        <div className="h-32 bg-gradient-to-r from-primary/20 to-primary/5" />
        <CardHeader className="-mt-16 rounded-t-3xl bg-card pt-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="mb-2 text-3xl font-bold">{exam.title}</CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-4 text-base">
                <span className="flex items-center">
                  <FileText className="mr-1 h-4 w-4" /> {exam.questionCount} câu hỏi
                </span>
                <span className="flex items-center">
                  <Clock className="mr-1 h-4 w-4" /> {new Date(exam.createdAt).toLocaleDateString("vi-VN")}
                </span>
              </CardDescription>
            </div>
            <Button variant="outline" size="icon" title="Xuất PDF" disabled>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="max-w-none space-y-4 text-sm leading-7 text-muted-foreground">
            <p>{exam.description || "Đề thi này đã sẵn sàng để bạn bắt đầu làm bài."}</p>
            <p>
              Bạn có thể chọn chế độ ôn tập hoặc thi thật, đồng thời bật đảo câu hỏi, đảo đáp án
              và tự động chuyển câu theo nhu cầu.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end border-t bg-muted/20 p-6">
          <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="px-8 text-lg">
                <Play className="mr-2 h-5 w-5" /> Bắt đầu thi
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Cấu hình làm bài</DialogTitle>
                <DialogDescription>
                  Tùy chỉnh các thiết lập trước khi bắt đầu làm bài.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="space-y-3">
                  <Label>Chế độ</Label>
                  <RadioGroup
                    value={config.mode}
                    onValueChange={(value) =>
                      setConfig((currentConfig) => ({
                        ...currentConfig,
                        mode: value as "PRACTICE" | "EXAM",
                      }))
                    }
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="PRACTICE" id="mode-practice" />
                      <Label htmlFor="mode-practice" className="cursor-pointer font-normal">
                        Practice (Ôn tập)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="EXAM" id="mode-exam" />
                      <Label htmlFor="mode-exam" className="cursor-pointer font-normal">
                        Exam (Thi thật)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-3">
                  <Label>Cấu hình đề thi</Label>
                  <div className="flex flex-col gap-3 rounded-md border bg-muted/10 p-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="shuffleQuestions"
                        checked={config.shuffleQuestions}
                        onCheckedChange={(checked) =>
                          setConfig((currentConfig) => ({
                            ...currentConfig,
                            shuffleQuestions: Boolean(checked),
                          }))
                        }
                      />
                      <Label htmlFor="shuffleQuestions" className="cursor-pointer font-normal">
                        Đảo câu hỏi
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="shuffleAnswers"
                        checked={config.shuffleAnswers}
                        onCheckedChange={(checked) =>
                          setConfig((currentConfig) => ({
                            ...currentConfig,
                            shuffleAnswers: Boolean(checked),
                          }))
                        }
                      />
                      <Label htmlFor="shuffleAnswers" className="cursor-pointer font-normal">
                        Đảo đáp án
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Tự động chuyển câu</Label>
                  <Select
                    value={config.autoNextSec.toString()}
                    onValueChange={(value) =>
                      setConfig((currentConfig) => ({
                        ...currentConfig,
                        autoNextSec: Number(value),
                      }))
                    }
                  >
                    <SelectTrigger>
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
                  <p className="text-xs text-muted-foreground">
                    Sau khi chọn đáp án, tự chuyển sang câu tiếp theo sau X giây.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="answerSound"
                    checked={config.answerSound}
                    onCheckedChange={(checked) =>
                      setConfig((currentConfig) => ({
                        ...currentConfig,
                        answerSound: Boolean(checked),
                      }))
                    }
                  />
                  <Label htmlFor="answerSound" className="cursor-pointer font-normal">
                    Bật âm thanh khi chọn đáp án
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsConfigOpen(false)}>
                  Hủy
                </Button>
                <Button onClick={() => startAttemptMutation.mutate()} disabled={startAttemptMutation.isPending}>
                  {startAttemptMutation.isPending ? "Đang tạo..." : "Bắt đầu"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardFooter>
      </Card>
    </div>
  );
}
