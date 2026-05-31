import React, { useState, forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { Exam, AttemptConfig } from "../types";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { FileText, Clock, Play } from "lucide-react";
import { cn } from "../lib/utils";
import { apiClient } from "../api/client";
import { useAuthStore } from "../store/authStore";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Checkbox } from "./ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";

interface ExamCardProps {
  exam: Exam;
  className?: string;
}

export const ExamCard = forwardRef<HTMLDivElement, ExamCardProps>(({ exam, className }, ref) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [config, setConfig] = useState<AttemptConfig>({
    mode: "PRACTICE",
    shuffleQuestions: false,
    shuffleAnswers: false,
    autoNextSec: 0,
    answerSound: false
  });

  const handleStart = async () => {
    try {
      const attempt = await apiClient.createAttempt(exam.id, config);
      navigate(`/attempts/${attempt.id}`);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <Card 
        ref={ref}
        className={cn("flex flex-col h-full rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 overflow-hidden border-border/50 group", className)}
        onClick={() => navigate(`/exams/${exam.id}`)}
      >
        <CardHeader className="p-5 pb-4">
          <h3 className="font-bold text-lg line-clamp-2 leading-tight mb-2 group-hover:text-primary transition-colors cursor-pointer">
            {exam.title}
          </h3>
          {exam.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {exam.description}
            </p>
          )}
        </CardHeader>
        
        <CardContent className="p-5 pt-0 flex-1 flex flex-col justify-end">
          <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm text-muted-foreground mb-4 mt-4">
            <div className="flex items-center">
              <FileText className="h-3.5 w-3.5 mr-2 opacity-70" />
              {exam.questionCount} câu
            </div>
            <div className="flex items-center">
              <Clock className="h-3.5 w-3.5 mr-2 opacity-70" />
              {new Date(exam.createdAt).toLocaleDateString("vi-VN")}
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="p-4 bg-muted/30 border-t flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
            <DialogTrigger asChild>
              <Button 
                className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0 h-9"
              >
                <Play className="h-4 w-4 mr-2" /> Làm bài
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]" onClick={(e) => e.stopPropagation()}>
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
                    onValueChange={(val) => setConfig({...config, mode: val as "PRACTICE" | "EXAM"})}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="PRACTICE" id="mode-practice" />
                      <Label htmlFor="mode-practice" className="font-normal cursor-pointer">Practice (Ôn tập)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="EXAM" id="mode-exam" />
                      <Label htmlFor="mode-exam" className="font-normal cursor-pointer">Exam (Thi thật)</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-3">
                  <Label>Cấu hình đề thi</Label>
                  <div className="flex flex-col gap-3 border rounded-md p-4 bg-muted/10">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="shuffleQuestions" 
                        checked={config.shuffleQuestions} 
                        onCheckedChange={(c) => setConfig({...config, shuffleQuestions: !!c})} 
                      />
                      <Label htmlFor="shuffleQuestions" className="cursor-pointer font-normal">Đảo câu hỏi</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="shuffleAnswers" 
                        checked={config.shuffleAnswers} 
                        onCheckedChange={(c) => setConfig({...config, shuffleAnswers: !!c})} 
                      />
                      <Label htmlFor="shuffleAnswers" className="cursor-pointer font-normal">Đảo đáp án</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Tự động chuyển câu</Label>
                  <Select 
                    value={config.autoNextSec.toString()} 
                    onValueChange={(val) => setConfig({...config, autoNextSec: Number(val) as any})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn thời gian" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Off (Tắt)</SelectItem>
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((sec) => (
                        <SelectItem key={sec} value={sec.toString()}>
                          {sec} giây
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Sau khi chọn đáp án, tự chuyển sang câu tiếp theo sau X giây.</p>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="answerSound" 
                    checked={config.answerSound} 
                    onCheckedChange={(c) => setConfig({...config, answerSound: !!c})} 
                  />
                  <Label htmlFor="answerSound" className="cursor-pointer font-normal">Bật âm thanh khi chọn đáp án</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsConfigOpen(false)}>Hủy</Button>
                <Button onClick={handleStart}>Bắt đầu</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardFooter>
      </Card>
    </>
  );
});
ExamCard.displayName = "ExamCard";
