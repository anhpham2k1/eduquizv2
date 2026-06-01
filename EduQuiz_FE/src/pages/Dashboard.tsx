import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Clock, Eye, FileText, Play, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "../api/client";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const examsQuery = useQuery({
    queryKey: ["dashboard", "exams"],
    queryFn: () => apiClient.getMyExams(),
  });

  const historyQuery = useQuery({
    queryKey: ["dashboard", "attempt-history"],
    queryFn: () => apiClient.getAttemptHistory(),
  });

  const deleteExamMutation = useMutation({
    mutationFn: (examId: string) => apiClient.deleteExam(examId),
    onSuccess: () => {
      toast.success("Đã xóa đề thi");
      queryClient.invalidateQueries({ queryKey: ["dashboard", "exams"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Xóa đề thi thất bại");
    },
  });

  const myExams = examsQuery.data ?? [];
  const history = historyQuery.data ?? [];
  const loading = examsQuery.isLoading || historyQuery.isLoading;
  const hasError = examsQuery.isError || historyQuery.isError;

  const handleDelete = (examId: string) => {
    if (!window.confirm("Bạn có chắc muốn xóa đề thi này không?")) {
      return;
    }

    deleteExamMutation.mutate(examId);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Quản lý đề thi và theo dõi lịch sử làm bài của bạn.
          </p>
        </div>
        <Link to="/exams/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Tạo đề thi mới
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="my-exams" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="my-exams">Đề thi của tôi</TabsTrigger>
          <TabsTrigger value="history">Lịch sử làm bài</TabsTrigger>
        </TabsList>

        <TabsContent value="my-exams" className="space-y-4">
          {loading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <Card key={item} className="h-48 animate-pulse bg-muted/50" />
              ))}
            </div>
          ) : hasError ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive">
              Không thể tải dashboard. Vui lòng thử lại sau.
            </div>
          ) : myExams.length === 0 ? (
            <div className="rounded-xl border border-dashed py-12 text-center">
              <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-medium">Chưa có đề thi nào</h3>
              <p className="mb-4 text-muted-foreground">
                Bạn chưa tạo đề thi nào. Hãy bắt đầu với lần import đầu tiên.
              </p>
              <Link to="/exams/new">
                <Button variant="outline">Tạo đề thi</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {myExams.map((exam) => (
                <Card key={exam.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="line-clamp-2 text-lg">{exam.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {exam.description || "Đề thi được tạo từ bộ câu hỏi trắc nghiệm của bạn."}
                    </CardDescription>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center">
                        <FileText className="mr-1 h-3 w-3" /> {exam.questionCount} câu
                      </span>
                      <span className="flex items-center">
                        <Clock className="mr-1 h-3 w-3" /> {new Date(exam.createdAt).toLocaleDateString("vi-VN")}
                      </span>
                      {exam.bestScore != null && (
                        <span className={`flex items-center ${exam.bestScore === exam.questionCount && exam.questionCount > 0 ? "text-green-600 font-medium" : ""}`}>
                          {exam.bestScore === exam.questionCount && exam.questionCount > 0 && <CheckCircle className="mr-1 h-3 w-3 text-green-600" />}
                          Tốt nhất: {exam.bestScore}/{exam.questionCount}
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1" />
                  <CardFooter className="flex gap-2 border-t pt-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => navigate(`/exams/${exam.id}`)}
                    >
                      <Eye className="mr-2 h-4 w-4" /> Chi tiết
                    </Button>
                    <Button className="flex-1" onClick={() => navigate(`/exams/${exam.id}`)}>
                      <Play className="mr-2 h-4 w-4" /> Làm bài
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10"
                      title="Xóa"
                      disabled={deleteExamMutation.isPending}
                      onClick={() => handleDelete(exam.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((item) => (
                <Card key={item} className="h-24 animate-pulse bg-muted/50" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="rounded-xl border border-dashed py-12 text-center">
              <Clock className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-medium">Chưa có lịch sử</h3>
              <p className="text-muted-foreground">Bạn chưa làm bài thi nào.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((attempt) => (
                <Card key={attempt.id} className="flex flex-col items-center justify-between p-6 sm:flex-row">
                  <div>
                    <CardTitle className="mb-1 text-lg">
                      Đề thi: {attempt.examTitle || attempt.examId}
                    </CardTitle>
                    <CardDescription>
                      Bắt đầu: {new Date(attempt.startedAt).toLocaleString("vi-VN")}
                      {attempt.finishedAt
                        ? ` • Thời gian: ${Math.floor(attempt.durationSec / 60)}p ${attempt.durationSec % 60}s`
                        : " • Chưa nộp bài"}
                      {attempt.totalQuestions != null && attempt.finishedAt ? ` • Điểm: ${attempt.correctCount}/${attempt.totalQuestions}` : ""}
                    </CardDescription>
                  </div>
                  <div className="mt-4 flex gap-2 sm:mt-0">
                    <Button variant="outline" onClick={() => navigate(`/attempts/${attempt.id}/result`)}>
                      Xem kết quả
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
