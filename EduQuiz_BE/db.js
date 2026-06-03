const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = process.env.DATA_DIR || __dirname;

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'eduquiz.db'));

db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');
db.pragma('temp_store = MEMORY');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    avatar_url TEXT,
    bio TEXT,
    location TEXT,
    provider TEXT NOT NULL DEFAULT 'LOCAL',
    has_password INTEGER NOT NULL DEFAULT 0,
    email_verified INTEGER NOT NULL DEFAULT 0,
    pending_email TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS exams (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    question_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    owner_id TEXT NOT NULL,
    duration_min INTEGER NOT NULL DEFAULT 60,
    shuffle_questions INTEGER NOT NULL DEFAULT 0,
    shuffle_answers INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    exam_id TEXT NOT NULL,
    no INTEGER NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    choices_json TEXT NOT NULL,
    correct_key TEXT NOT NULL,
    explanation TEXT,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS attempts (
    id TEXT PRIMARY KEY,
    exam_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    finished_at TEXT,
    duration_sec INTEGER NOT NULL DEFAULT 0,
    config_json TEXT,
    bookmarks_json TEXT,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS answers (
    attempt_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    choice_key TEXT NOT NULL,
    PRIMARY KEY (attempt_id, question_id),
    FOREIGN KEY (attempt_id) REFERENCES attempts(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_exams_owner ON exams(owner_id);
  CREATE INDEX IF NOT EXISTS idx_questions_exam ON questions(exam_id);
  CREATE INDEX IF NOT EXISTS idx_attempts_user ON attempts(user_id);
  CREATE INDEX IF NOT EXISTS idx_attempts_exam ON attempts(exam_id);
  CREATE INDEX IF NOT EXISTS idx_answers_attempt ON answers(attempt_id);
`);

module.exports = db;
