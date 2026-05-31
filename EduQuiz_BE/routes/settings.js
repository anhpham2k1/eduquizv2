const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// PUT /api/settings/profile
router.put('/profile', authMiddleware, (req, res) => {
  try {
    const { name, username, bio, location } = req.body;
    const userId = req.user.id;

    if (!name || name.length < 2) {
      return res.status(400).json({ error: 'Tên phải có ít nhất 2 ký tự' });
    }
    if (!username || username.length < 3) {
      return res.status(400).json({ error: 'Username phải có ít nhất 3 ký tự' });
    }

    // Check username uniqueness
    const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, userId);
    if (existing) {
      return res.status(409).json({ error: 'Username đã được sử dụng' });
    }

    db.prepare(`
      UPDATE users SET name = ?, username = ?, bio = ?, location = ? WHERE id = ?
    `).run(name, username, bio || null, location || null, userId);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    res.json({ user: formatUser(user) });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// PUT /api/settings/password - change password (requires current password)
router.put('/password', authMiddleware, (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 8 ký tự' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

    if (!user.password_hash) {
      return res.status(400).json({ error: 'Tài khoản chưa có mật khẩu. Hãy dùng chức năng đặt mật khẩu.' });
    }

    const valid = bcrypt.compareSync(currentPassword, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Mật khẩu hiện tại không đúng' });
    }

    const hash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, userId);

    res.json({ message: 'Đã đổi mật khẩu' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

// POST /api/settings/password - set password for accounts that do not have one
router.post('/password', authMiddleware, (req, res) => {
  try {
    const { newPassword } = req.body;
    const userId = req.user.id;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 8 ký tự' });
    }

    const hash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ?, has_password = 1 WHERE id = ?').run(hash, userId);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    res.json({ user: formatUser(user) });
  } catch (err) {
    console.error('Set password error:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

function formatUser(row) {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    email: row.email,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    location: row.location,
    hasPassword: !!row.has_password,
    provider: row.provider,
    emailVerified: !!row.email_verified,
    pendingEmail: row.pending_email
  };
}

module.exports = router;
