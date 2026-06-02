import mammoth from 'mammoth';
import { Question } from '../types';

export const parseQuizText = (text: string): Question[] => {
  // Chuẩn hóa văn bản: xử lý khoảng trắng đặc biệt và xuống dòng
  const cleanedText = text
    .replace(/\xa0/g, ' ') // Xử lý non-breaking space từ Word
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .join('\n');

  // Regex nhận diện bắt đầu câu hỏi: "Câu 1.", "Câu hỏi 1.", hoặc chỉ "1." ở đầu dòng
  const questionStartRegex = /^(?:(?:Câu\s+hỏi|Câu)\s*\d+|\d+)[\s.:\)-]/i;
  // Regex nhận diện bắt đầu đáp án: "A.", "B.", "*A.", "*C."
  const optionStartRegex = /^(\*?\s*[A-F])[\s.:\)-]/i;

  const lines = cleanedText.split('\n');
  const questions: Question[] = [];
  let currentQuestion: Partial<Question> | null = null;
  let currentOptions: { key: "A"|"B"|"C"|"D"|"E"|"F"; text: string; isCorrect: boolean }[] = [];
  let currentParsingTarget: 'question' | 'option' | null = null;

  lines.forEach((line) => {
    if (!line) return;

    if (questionStartRegex.test(line)) {
      // Lưu câu hỏi cũ nếu có
      if (currentQuestion && currentOptions.length > 0) {
        questions.push(finalizeQuestion(currentQuestion, currentOptions, questions.length + 1));
      }
      
      // Khởi tạo câu hỏi mới
      const text = line.replace(/^(?:(?:Câu\s+hỏi|Câu)\s*\d+|\d+)[\s.:\)-]\s*/i, '').trim();
      currentQuestion = { content: text };
      currentOptions = [];
      currentParsingTarget = 'question';
    } 
    else if (optionStartRegex.test(line)) {
      const match = line.match(/^(\*?)\s*([A-F])[\s.:\)-]\s*(.*)/i);
      if (match) {
        const isCorrect = match[1] === '*';
        const key = match[2].toUpperCase() as "A"|"B"|"C"|"D"|"E"|"F";
        const text = match[3].trim();
        currentOptions.push({ key, text, isCorrect });
        currentParsingTarget = 'option';
      }
    } 
    else {
      // Xử lý dòng nội dung nối tiếp (không có nhãn)
      if (currentParsingTarget === 'question' && currentQuestion) {
        currentQuestion.content += '\n' + line;
      } else if (currentParsingTarget === 'option' && currentOptions.length > 0) {
        currentOptions[currentOptions.length - 1].text += '\n' + line;
      }
    }
  });

  // Lưu câu hỏi cuối cùng
  if (currentQuestion && currentOptions.length > 0) {
    questions.push(finalizeQuestion(currentQuestion, currentOptions, questions.length + 1));
  }

  return questions;
};

// Hàm chuẩn hóa câu hỏi cuối cùng
const finalizeQuestion = (
  q: Partial<Question>, 
  opts: { key: "A"|"B"|"C"|"D"|"E"|"F"; text: string; isCorrect: boolean }[], 
  no: number
): Question => {
  const correctOpt = opts.find(o => o.isCorrect) || opts[0];
  
  return {
    id: `q-${no}-${Date.now()}`,
    no,
    content: q.content || 'Câu hỏi không có nội dung',
    choices: opts.map(o => ({ key: o.key, text: o.text })),
    correctKey: correctOpt ? correctOpt.key : "A"
  };
};

export const processDocxFile = async (file: File): Promise<Question[]> => {
  const isDocx = file.name.endsWith('.docx');
  const isTxt = file.name.endsWith('.txt');

  if (!isDocx && !isTxt) {
    throw new Error("Định dạng file không hỗ trợ. Vui lòng sử dụng .docx hoặc .txt");
  }
  
  try {
    let text = "";
    if (isDocx) {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      text = result.value;
    } else {
      text = await file.text();
    }

    if (!text || text.trim().length === 0) {
      throw new Error("Tệp tin rỗng.");
    }
    
    const parsed = parseQuizText(text);
    if (parsed.length === 0) {
      throw new Error("Không tìm thấy câu hỏi nào hợp lệ. Vui lòng kiểm tra định dạng (Câu 1. hoặc 1.)");
    }
    return parsed;
  } catch (err: any) {
    throw new Error(err.message || "Lỗi khi đọc tệp tin.");
  }
};
