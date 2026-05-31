import { Link } from "react-router-dom";
import { FileText, PlayCircle, Share2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { useAuthStore } from "../store/authStore";

export default function Landing() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4 text-center">
      <h1 className="mb-6 text-4xl font-extrabold tracking-tight lg:text-5xl">
        Nền tảng thi thử trực tuyến <span className="text-primary">EduQuiz</span>
      </h1>
      <p className="mb-8 max-w-[600px] text-xl text-muted-foreground">
        Tạo đề thi từ file Word nhanh chóng, làm bài như thật và quản lý toàn bộ bộ câu hỏi của bạn ở một nơi.
      </p>

      <div className="mb-16 flex flex-wrap justify-center gap-4">
        <Link to={user ? "/dashboard" : "/auth/login"}>
          <Button size="lg" className="h-12 px-8 text-lg">
            {user ? "Vào Dashboard" : "Bắt đầu ngay"}
          </Button>
        </Link>
        <Link to={user ? "/exams/new" : "/auth/register"}>
          <Button size="lg" variant="outline" className="h-12 px-8 text-lg">
            {user ? "Tạo đề thi" : "Tạo tài khoản"}
          </Button>
        </Link>
      </div>

      <div className="grid w-full max-w-5xl grid-cols-1 gap-8 md:grid-cols-3">
        <div className="flex flex-col items-center rounded-xl border bg-card p-6 shadow-sm">
          <FileText className="mb-4 h-12 w-12 text-primary" />
          <h3 className="mb-2 text-xl font-semibold">Import Word</h3>
          <p className="text-center text-muted-foreground">
            Tự động nhận diện câu hỏi và đáp án từ file .docx hoặc .txt theo định dạng chuẩn.
          </p>
        </div>
        <div className="flex flex-col items-center rounded-xl border bg-card p-6 shadow-sm">
          <PlayCircle className="mb-4 h-12 w-12 text-primary" />
          <h3 className="mb-2 text-xl font-semibold">Thi thử như thật</h3>
          <p className="text-center text-muted-foreground">
            Giao diện làm bài tối ưu, có chế độ ôn tập và thi thật, hỗ trợ đảo câu hỏi và đáp án.
          </p>
        </div>
        <div className="flex flex-col items-center rounded-xl border bg-card p-6 shadow-sm">
          <Share2 className="mb-4 h-12 w-12 text-primary" />
          <h3 className="mb-2 text-xl font-semibold">Quản lý tập trung</h3>
          <p className="text-center text-muted-foreground">
            Theo dõi đề thi, lịch sử làm bài và kết quả chi tiết ngay trên dashboard cá nhân.
          </p>
        </div>
      </div>
    </div>
  );
}
