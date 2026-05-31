const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, (req, res) => {
  try {
    const attempts = db.prepare(`
      SELECT a.*, e.title AS exam_title
      FROM attempts a
      JOIN exams e ON a.exam_id = e.id
      WHERE a.user_id = ?
      ORDER BY a.started_at DESC
    `).all(req.user.id);

    res.json(attempts.map(formatAttempt));
  } catch (err) {
    console.error('Get attempts error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

router.post('/', authMiddleware, (req, res) => {
  try {
    const { examId, config } = req.body;

    if (!examId) {
      return res.status(400).json({ error: 'Exam ID is required' });
    }

    const exam = db.prepare(`
      SELECT * FROM exams
      WHERE id = ? AND owner_id = ?
    `).get(examId, req.user.id);

    if (!exam) {
      return res.status(404).json({ error: 'Không tìm thấy đề thi' });
    }

    const attemptId = uuidv4();
    const startedAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO attempts (id, exam_id, user_id, started_at, config_json)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      attemptId,
      examId,
      req.user.id,
      startedAt,
      config ? JSON.stringify(config) : null,
    );

    const attempt = db.prepare('SELECT * FROM attempts WHERE id = ?').get(attemptId);
    res.status(201).json(formatAttempt(attempt));
  } catch (err) {
    console.error('Create attempt error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

router.put('/:id/answer', authMiddleware, (req, res) => {
  try {
    const { questionId, choiceKey } = req.body;
    const attemptId = req.params.id;

    if (!questionId || !choiceKey) {
      return res.status(400).json({ error: 'questionId and choiceKey are required' });
    }

    const attempt = getAttemptForUser(attemptId, req.user.id);
    if (!attempt) {
      return res.status(404).json({ error: 'Không tìm thấy lượt làm bài' });
    }

    if (attempt.finished_at) {
      return res.status(400).json({ error: 'Bài làm đã được nộp' });
    }

    const question = db.prepare(`
      SELECT id FROM questions
      WHERE id = ? AND exam_id = ?
    `).get(questionId, attempt.exam_id);

    if (!question) {
      return res.status(404).json({ error: 'Không tìm thấy câu hỏi' });
    }

    db.prepare(`
      INSERT INTO answers (attempt_id, question_id, choice_key)
      VALUES (?, ?, ?)
      ON CONFLICT(attempt_id, question_id)
      DO UPDATE SET choice_key = excluded.choice_key
    `).run(attemptId, questionId, choiceKey);

    res.json({ message: 'Đã lưu câu trả lời' });
  } catch (err) {
    console.error('Save answer error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

router.put('/:id/submit', authMiddleware, (req, res) => {
  try {
    const attemptId = req.params.id;
    const attempt = getAttemptForUser(attemptId, req.user.id);

    if (!attempt) {
      return res.status(404).json({ error: 'Không tìm thấy lượt làm bài' });
    }

    if (attempt.finished_at) {
      return res.json({ message: 'Bài làm đã được nộp trước đó' });
    }

    const finishedAt = new Date().toISOString();
    const durationSec = Math.floor(
      (new Date(finishedAt).getTime() - new Date(attempt.started_at).getTime()) / 1000,
    );

    const bookmarks = Array.isArray(req.body?.bookmarks) ? req.body.bookmarks : [];

    db.prepare(`
      UPDATE attempts
      SET finished_at = ?, duration_sec = ?, bookmarks_json = ?
      WHERE id = ?
    `).run(
      finishedAt,
      durationSec,
      JSON.stringify(bookmarks),
      attemptId,
    );

    res.json({ message: 'Đã nộp bài' });
  } catch (err) {
    console.error('Submit attempt error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

router.get('/:id/session', authMiddleware, (req, res) => {
  try {
    const attempt = getAttemptForUser(req.params.id, req.user.id);

    if (!attempt) {
      return res.status(404).json({ error: 'Không tìm thấy lượt làm bài' });
    }

    const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(attempt.exam_id);
    if (!exam) {
      return res.status(404).json({ error: 'Không tìm thấy đề thi' });
    }

    const attemptConfig = parseJson(attempt.config_json, undefined);
    const revealAnswer = !!attempt.finished_at || attemptConfig?.mode === 'PRACTICE';

    const questions = db.prepare(`
      SELECT * FROM questions
      WHERE exam_id = ?
      ORDER BY no ASC
    `).all(attempt.exam_id);

    const answersMap = getAnswersMap(attempt.id);
    const formattedAttempt = formatAttempt(attempt);
    formattedAttempt.answers = answersMap;

    res.json({
      attempt: formattedAttempt,
      exam: formatExam(exam),
      questions: questions.map((question) => formatQuestion(question, { revealAnswer })),
    });
  } catch (err) {
    console.error('Get attempt session error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

router.get('/:id', authMiddleware, (req, res) => {
  try {
    const attempt = getAttemptForUser(req.params.id, req.user.id);

    if (!attempt) {
      return res.status(404).json({ error: 'Không tìm thấy lượt làm bài' });
    }

    const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(attempt.exam_id);
    if (!exam) {
      return res.status(404).json({ error: 'Không tìm thấy đề thi' });
    }

    const questions = db.prepare(`
      SELECT * FROM questions
      WHERE exam_id = ?
      ORDER BY no ASC
    `).all(attempt.exam_id);

    const formattedAttempt = formatAttempt(attempt);
    formattedAttempt.answers = getAnswersMap(attempt.id);

    res.json({
      attempt: formattedAttempt,
      exam: formatExam(exam),
      questions: questions.map((question) => formatQuestion(question, { revealAnswer: true })),
    });
  } catch (err) {
    console.error('Get attempt result error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

function getAttemptForUser(attemptId, userId) {
  return db.prepare(`
    SELECT * FROM attempts
    WHERE id = ? AND user_id = ?
  `).get(attemptId, userId);
}

function getAnswersMap(attemptId) {
  const answerRows = db.prepare(`
    SELECT * FROM answers
    WHERE attempt_id = ?
  `).all(attemptId);

  return answerRows.reduce((result, answer) => {
    result[answer.question_id] = answer.choice_key;
    return result;
  }, {});
}

function parseJson(value, fallback) {
  if (!value) return fallback;

  try {
    return JSON.parse(value);
  } catch (err) {
    return fallback;
  }
}

function formatAttempt(row) {
  return {
    id: row.id,
    examId: row.exam_id,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    durationSec: row.duration_sec || 0,
    answers: {},
    bookmarks: parseJson(row.bookmarks_json, []),
    config: parseJson(row.config_json, undefined),
    examTitle: row.exam_title || undefined,
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
    shuffleQuestions: !!row.shuffle_questions,
    shuffleAnswers: !!row.shuffle_answers,
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
