const bcrypt = require('bcryptjs');
const db = require('../db');

const DEFAULT_MIGRATION_PASSWORD = '12345678';

function getMigrationPassword() {
  return process.env.AUTH_MIGRATION_PASSWORD || DEFAULT_MIGRATION_PASSWORD;
}

function getTargets() {
  return db.prepare(`
    SELECT id, name, username, email, provider, has_password, password_hash
    FROM users
    WHERE provider != 'LOCAL' OR has_password = 0 OR password_hash IS NULL
    ORDER BY created_at ASC, username ASC
  `).all();
}

function hasUsernameConflict(user) {
  return db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(user.email, user.id);
}

function migrateGoogleUsers() {
  const targets = getTargets();

  if (targets.length === 0) {
    return;
  }

  const password = getMigrationPassword();
  if (password.length < 8) {
    throw new Error('AUTH_MIGRATION_PASSWORD must be at least 8 characters.');
  }

  const migrated = [];
  const skipped = [];
  const passwordHash = bcrypt.hashSync(password, 10);

  const updateUser = db.prepare(`
    UPDATE users
    SET username = ?,
        password_hash = ?,
        provider = 'LOCAL',
        has_password = 1,
        email_verified = 1
    WHERE id = ?
  `);

  const migrate = db.transaction(() => {
    for (const user of targets) {
      if (!user.email || hasUsernameConflict(user)) {
        skipped.push(user);
        continue;
      }

      updateUser.run(user.email.trim(), passwordHash, user.id);
      migrated.push(user);
    }
  });

  migrate();

  if (migrated.length > 0) {
    console.log(`Migrated ${migrated.length} Google/passwordless user(s) to username=email with temporary password ${password}.`);
    for (const user of migrated) {
      console.log(`- ${user.username} -> ${user.email}`);
    }
  }

  if (skipped.length > 0) {
    console.warn(`Skipped ${skipped.length} user(s) during auth migration because their email is empty or already used as another username.`);
    for (const user of skipped) {
      console.warn(`- ${user.username} (${user.email || 'no email'})`);
    }
  }
}

module.exports = { migrateGoogleUsers };
