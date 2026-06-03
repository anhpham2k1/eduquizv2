const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { processDocumentBuffer } = require('../lib/parser');

const router = express.Router();
const VALID_CHOICE_KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const normalizedName = file.originalname.toLowerCase();

    if (normalizedName.endsWith('.docx') || normalizedName.endsWith('.txt')) {
      cb(null, true);
      return;
    }

    cb(new Error('Chỉ hỗ trợ định dạng .docx hoặc .txt'));
  },
});

const insertExamStatement = db.prepare(`
  INSERT INTO exams (id, title, description, question_count, created_at, owner_id, duration_min)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const insertQuestionStatement = db.prepare(`
  INSERT INTO questions (id, exam_id, no, content, choices_json, correct_key, explanation)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const createExamTransaction = db.transaction(({ examId, title, description, ownerId, durationMin, questions }) => {
  const createdAt = new Date().toISOString();

  insertExamStatement.run(
    examId,
    title,
    description || null,
    questions.length,
    createdAt,
    ownerId,
    durationMin
  );

  questions.forEach((question, index) => {
    insertQuestionStatement.run(
      uuidv4(),
      examId,
      question.no || index + 1,
      question.content,
      JSON.stringify(question.choices),
      question.correctKey,
      question.explanation || null,
    );
  });
});

router.get('/', authMiddleware, (req, res) => {
  try {
    const exams = db.prepare(`
      SELECT e.*,
        (
          SELECT MAX(
            (
              SELECT COUNT(*)
              FROM answers ans
              JOIN questions q ON ans.question_id = q.id
              WHERE ans.attempt_id = a.id AND ans.choice_key = q.correct_key
            )
          )
          FROM attempts a
          WHERE a.exam_id = e.id AND a.user_id = ? AND a.finished_at IS NOT NULL
        ) AS best_correct_count
      FROM exams e
      WHERE e.owner_id = ?
      ORDER BY e.created_at DESC
    `).all(req.user.id, req.user.id);

    res.json(exams.map(formatExam));
  } catch (err) {
    console.error('Get exams error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

router.post('/parse', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Vui lòng tải lên file đề thi' });
    }

    const questions = await processDocumentBuffer(req.file.buffer, req.file.originalname);

    res.json({
      titleSuggestion: req.file.originalname.replace(/\.(docx|txt)$/i, ''),
      questions,
    });
  } catch (err) {
    console.error('Parse exam file error:', err);
    res.status(400).json({ error: err.message || 'Không thể đọc file đề thi' });
  }
});

router.post('/', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const title = sanitizeText(req.body.title);
    const description = sanitizeNullableText(req.body.description);
    const durationMin = parseInt(req.body.durationMin, 10) || 60;

    if (!title) {
      return res.status(400).json({ error: 'Vui lòng nhập tiêu đề đề thi' });
    }

    let questions = [];

    if (req.file) {
      questions = await processDocumentBuffer(req.file.buffer, req.file.originalname);
    } else {
      questions = normalizeQuestions(req.body.questions);
    }

    if (!questions.length) {
      return res.status(400).json({ error: 'Đề thi phải có ít nhất 1 câu hỏi' });
    }

    const examId = uuidv4();
    createExamTransaction({
      examId,
      title,
      description,
      ownerId: req.user.id,
      durationMin,
      questions,
    });

    const exam = db.prepare(`
      SELECT * FROM exams
      WHERE id = ? AND owner_id = ?
    `).get(examId, req.user.id);

    res.status(201).json(formatExam(exam));
  } catch (err) {
    console.error('Create exam error:', err);
    res.status(400).json({ error: err.message || 'Không thể tạo đề thi' });
  }
});

router.get('/:id', authMiddleware, (req, res) => {
  try {
    const exam = db.prepare(`
      SELECT * FROM exams
      WHERE id = ? AND owner_id = ?
    `).get(req.params.id, req.user.id);

    if (!exam) {
      return res.status(404).json({ error: 'Không tìm thấy đề thi' });
    }

    const questions = db.prepare(`
      SELECT * FROM questions
      WHERE exam_id = ?
      ORDER BY no ASC
    `).all(req.params.id);

    res.json({
      exam: formatExam(exam),
      questions: questions.map((question) => formatQuestion(question, { revealAnswer: true })),
    });
  } catch (err) {
    console.error('Get exam error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const exam = db.prepare(`
      SELECT * FROM exams
      WHERE id = ? AND owner_id = ?
    `).get(req.params.id, req.user.id);

    if (!exam) {
      return res.status(404).json({ error: 'Không tìm thấy đề thi' });
    }

    db.prepare('DELETE FROM exams WHERE id = ?').run(req.params.id);
    res.json({ message: 'Đã xóa đề thi' });
  } catch (err) {
    console.error('Delete exam error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

function sanitizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function sanitizeNullableText(value) {
  const normalized = sanitizeText(value);
  return normalized || null;
}

function normalizeQuestions(rawQuestions) {
  const parsedQuestions = typeof rawQuestions === 'string'
    ? JSON.parse(rawQuestions)
    : rawQuestions;

  if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
    throw new Error('Đề thi phải có ít nhất 1 câu hỏi');
  }

  return parsedQuestions.map((question, index) => normalizeQuestion(question, index));
}

function normalizeQuestion(question, index) {
  const content = sanitizeText(question?.content);
  if (!content) {
    throw new Error(`Câu ${index + 1} chưa có nội dung`);
  }

  const rawChoices = Array.isArray(question?.choices) ? question.choices : [];
  const choices = rawChoices
    .map((choice) => ({
      key: sanitizeText(choice?.key).toUpperCase(),
      text: sanitizeText(choice?.text),
    }))
    .filter((choice) => choice.key && choice.text);

  if (choices.length < 2) {
    throw new Error(`Câu ${index + 1} phải có ít nhất 2 đáp án`);
  }

  const usedKeys = new Set();
  const normalizedChoices = choices.map((choice) => {
    if (!VALID_CHOICE_KEYS.includes(choice.key)) {
      throw new Error(`Câu ${index + 1} có đáp án không hợp lệ`);
    }

    if (usedKeys.has(choice.key)) {
      throw new Error(`Câu ${index + 1} có đáp án bị trùng`);
    }

    usedKeys.add(choice.key);
    return choice;
  });

  const correctKey = sanitizeText(question?.correctKey).toUpperCase() || normalizedChoices[0].key;
  if (!usedKeys.has(correctKey)) {
    throw new Error(`Câu ${index + 1} thiếu đáp án đúng hợp lệ`);
  }

  return {
    no: Number.isInteger(question?.no) ? question.no : index + 1,
    content,
    choices: normalizedChoices,
    correctKey,
    explanation: sanitizeNullableText(question?.explanation),
  };
}

function formatExam(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    questionCount: row.question_count,
    createdAt: row.created_at,
    ownerId: row.owner_id,
    durationMin: row.duration_min,
    shuffleQuestions: !!row.shuffle_questions,
    shuffleAnswers: !!row.shuffle_answers,
    bestScore: row.best_correct_count != null ? row.best_correct_count : undefined,
  };
}

function formatQuestion(row, { revealAnswer }) {
  const question = {
    id: row.id,
    no: row.no,
    content: row.content,
    imageUrl: row.image_url,
    choices: JSON.parse(row.choices_json),
  };

  if (revealAnswer) {
    question.correctKey = row.correct_key;
    question.explanation = row.explanation;
  }

  return question;
}

module.exports = router;
