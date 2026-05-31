const db = require('../db');
const { migrateGoogleUsers } = require('../lib/migrateGoogleUsers');

const HELP = `
Migrate Google/passwordless users to LOCAL username/password login.

Automatic migration also runs when the backend starts.

Usage:
  npm run migrate:google-users -- --dry-run
  npm run migrate:google-users -- --apply

Migration behavior:
  username = existing email
  password = AUTH_MIGRATION_PASSWORD or 12345678
`;

function getTargets() {
  return db.prepare(`
    SELECT id, name, username, email, provider, has_password, password_hash
    FROM users
    WHERE provider != 'LOCAL' OR has_password = 0 OR password_hash IS NULL
    ORDER BY created_at ASC, username ASC
  `).all();
}

function showDryRun() {
  const targets = getTargets();

  if (targets.length === 0) {
    console.log('No Google/passwordless users found.');
    return;
  }

  console.log(`Found ${targets.length} user(s) to migrate:`);
  for (const user of targets) {
    console.log(`- ${user.username} -> ${user.email}`);
  }
  console.log('\nDry run only. Re-run with --apply to update the database.');
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(HELP.trim());
    return;
  }

  if (args.includes('--apply')) {
    migrateGoogleUsers();
    return;
  }

  showDryRun();
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
