// Seeds a demo company: employees in every role, teams, projects, issues and comments.
// Run: npm run seed   (safe to re-run: people/teams are upserted, projects are only added if their key is new)
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { initDb } = require('./db');

const PASSWORD = 'password123';

// key, name, email, role, employee code, designation, department, phone, joined (days ago), status
const EMPLOYEES = [
  ['admin', 'Admin User', 'admin@example.com', 'admin', 'EMP9001', 'Engineering Manager', 'Engineering', '+91 98450 10001', 1400, 'active'],
  ['priya', 'Priya Sharma', 'priya@example.com', 'admin', 'EMP9004', 'Product Manager', 'Product', '+91 98450 10004', 900, 'active'],
  ['alice', 'Alice Developer', 'alice@example.com', 'team_lead', 'EMP9002', 'Senior Developer', 'Engineering', '+91 98450 10002', 1100, 'active'],
  ['rahul', 'Rahul Verma', 'rahul@example.com', 'team_lead', 'EMP9005', 'Mobile Lead', 'Engineering', '+91 98450 10005', 820, 'active'],
  ['sofia', 'Sofia Martinez', 'sofia@example.com', 'team_lead', 'EMP9006', 'QA Lead', 'Quality', '+91 98450 10006', 760, 'active'],
  ['daniel', 'Daniel Kim', 'daniel@example.com', 'team_lead', 'EMP9007', 'DevOps Lead', 'Operations', '+91 98450 10007', 980, 'active'],
  ['bob', 'Bob Tester', 'bob@example.com', 'member', 'EMP9003', 'QA Engineer', 'Quality', '+91 98450 10003', 600, 'active'],
  ['arjun', 'Arjun Reddy', 'arjun@example.com', 'member', 'EMP9008', 'Frontend Developer', 'Engineering', '+91 98450 10008', 540, 'active'],
  ['meera', 'Meera Nair', 'meera@example.com', 'member', 'EMP9009', 'Backend Developer', 'Engineering', '+91 98450 10009', 480, 'active'],
  ['kiran', 'Kiran Rao', 'kiran@example.com', 'member', 'EMP9010', 'Full Stack Developer', 'Engineering', '+91 98450 10010', 300, 'active'],
  ['chen', 'Chen Wei', 'chen@example.com', 'member', 'EMP9011', 'iOS Developer', 'Engineering', '+91 98450 10011', 420, 'active'],
  ['fatima', 'Fatima Khan', 'fatima@example.com', 'member', 'EMP9012', 'Android Developer', 'Engineering', '+91 98450 10012', 390, 'active'],
  ['lucas', 'Lucas Brown', 'lucas@example.com', 'member', 'EMP9013', 'UI/UX Designer', 'Design', '+91 98450 10013', 350, 'active'],
  ['ananya', 'Ananya Iyer', 'ananya@example.com', 'member', 'EMP9014', 'Automation Tester', 'Quality', '+91 98450 10014', 210, 'active'],
  ['omar', 'Omar Haddad', 'omar@example.com', 'member', 'EMP9015', 'Site Reliability Engineer', 'Operations', '+91 98450 10015', 450, 'active'],
  ['emma', 'Emma Wilson', 'emma@example.com', 'member', 'EMP9016', 'Cloud Engineer', 'Operations', '+91 98450 10016', 700, 'inactive'],
  ['vikram', 'Vikram Singh', 'vikram@example.com', 'member', 'EMP9017', 'Junior Developer', 'Engineering', '+91 98450 10017', 7, 'active'],
];

// name, description, lead key, member keys
const TEAMS = [
  ['Core Team', 'Builds the web platform and backend APIs', 'alice', ['arjun', 'meera', 'kiran']],
  ['Mobile Team', 'iOS and Android apps, plus product design', 'rahul', ['chen', 'fatima', 'lucas']],
  ['QA Team', 'Manual and automated testing, release sign-off', 'sofia', ['bob', 'ananya']],
  ['DevOps Team', 'CI/CD, cloud infrastructure and monitoring', 'daniel', ['omar', 'emma']],
];

// Issue: [title, type, status, priority, assignee key | null, due (days from today) | null, created (days ago), description, comments]
// Comment: [author key, days ago, text]
const PROJECTS = [
  {
    key: 'WEB',
    name: 'Customer Portal',
    description: 'Self-service web portal where customers manage accounts, orders and support tickets.',
    lead: 'alice',
    reporter: 'priya',
    issues: [
      ['Customer self-service portal v2', 'epic', 'in_progress', 'high', 'alice', 30, 40,
        'Umbrella epic for the portal redesign: new navigation, faster dashboard, and order tracking.', [
          ['priya', 39, 'Target is to ship v2 before the end of the quarter. Please break this into stories.'],
          ['alice', 38, 'Stories are created. I will review the scope with the team on Monday.'],
        ]],
      ['As a customer I can track my order status in real time', 'story', 'in_progress', 'high', 'arjun', 9, 21,
        'Show a timeline (Placed > Packed > Shipped > Delivered) on the order page. Data comes from the /orders/:id/events API.\n\nAcceptance criteria:\n- Timeline updates without page refresh\n- Works on mobile widths', [
          ['arjun', 10, 'Timeline UI is done. Waiting on the events API from Meera.'],
          ['meera', 8, 'API is merged to develop, you can integrate now.'],
        ]],
      ['Build /orders/:id/events API', 'task', 'done', 'high', 'meera', null, 25,
        'Expose order events from the fulfilment service. Paginate and sort by timestamp.', [
          ['alice', 12, 'Reviewed and approved. Nice work on the tests.'],
        ]],
      ['Dashboard takes 8 seconds to load for large accounts', 'bug', 'in_review', 'highest', 'meera', 2, 14,
        'Accounts with more than 5,000 orders see very slow dashboard loads. Profiling shows an N+1 query on the invoices widget.\n\nSteps: log in as bigcorp@test, open Dashboard.', [
          ['sofia', 13, 'Reproduced on staging: 8.2s average.'],
          ['meera', 4, 'Fixed with a single JOIN and an index on invoices(account_id). Now ~600ms. PR is up.'],
          ['bob', 3, 'Will verify on staging after the deploy.'],
        ]],
      ['Login fails when password contains a "+" character', 'bug', 'done', 'high', 'kiran', null, 30,
        'The password was being URL-encoded twice. Users with "+" in their password could not log in.', [
          ['bob', 29, 'Confirmed on Chrome and Firefox.'],
          ['kiran', 27, 'Fixed and released in 2.3.1.'],
        ]],
      ['Redesign account settings page', 'story', 'todo', 'medium', 'lucas', 20, 10,
        'Group settings into Profile, Security, Notifications and Billing tabs. Figma link in the epic.', []],
      ['Add two-factor authentication (TOTP)', 'story', 'todo', 'high', 'kiran', 25, 9,
        'Allow users to enable 2FA with an authenticator app. Include recovery codes.', [
          ['priya', 8, 'This is a requirement from two enterprise customers. Please prioritise after order tracking.'],
        ]],
      ['Invoice PDF shows wrong currency symbol for EUR', 'bug', 'todo', 'medium', 'arjun', -3, 12,
        'Invoices for EU customers show "$" instead of "€". The amount itself is correct.', [
          ['sofia', 11, 'Happens only for invoices generated before the locale is loaded.'],
        ]],
      ['Write end-to-end tests for checkout flow', 'task', 'in_progress', 'medium', 'ananya', 6, 8,
        'Cover guest checkout, saved card and coupon code paths using Playwright.', []],
      ['Upgrade React to 18 and remove deprecated lifecycles', 'task', 'done', 'low', 'arjun', null, 45,
        'Housekeeping task. Remove componentWillReceiveProps usages.', []],
      ['Search results do not highlight matched text', 'bug', 'todo', 'low', null, null, 5,
        'Minor UX issue reported by a customer. Matched terms should be bold in search results.', []],
      ['Add "Download all invoices" as ZIP', 'story', 'todo', 'lowest', null, null, 3,
        'Nice-to-have request from the finance team.', []],
      ['Onboarding: set up local dev environment', 'task', 'in_progress', 'low', 'vikram', 2, 6,
        'Welcome, Vikram! Follow the README, run the app locally, and fix one "good first issue".', [
          ['alice', 6, 'Ping me if you get stuck on the database setup.'],
          ['vikram', 5, 'App is running locally. Picking up the search highlight bug next.'],
        ]],
      ['Session timeout warning before auto logout', 'story', 'in_review', 'medium', 'kiran', 4, 15,
        'Show a modal 2 minutes before the session expires with "Stay signed in" option.', [
          ['bob', 2, 'Tested: works, but the countdown keeps running in background tabs. Minor.'],
        ]],
    ],
  },
  {
    key: 'MOB',
    name: 'Mobile App',
    description: 'iOS and Android apps for customers on the go.',
    lead: 'rahul',
    reporter: 'priya',
    issues: [
      ['Mobile app 3.0 release', 'epic', 'in_progress', 'highest', 'rahul', 18, 35,
        'Release 3.0 includes push notifications, biometric login and the new home screen.', [
          ['priya', 34, 'Marketing launch is planned around this release. Keep me posted on any risk.'],
        ]],
      ['Push notifications for order updates', 'story', 'in_progress', 'high', 'fatima', 8, 20,
        'Use FCM on Android and APNs on iOS. Users can turn off notifications per category.', [
          ['fatima', 7, 'Android side is working end to end on test devices.'],
          ['chen', 6, 'iOS needs the new APNs key from DevOps.'],
          ['daniel', 5, 'Key is uploaded to the secrets store.'],
        ]],
      ['Face ID / fingerprint login', 'story', 'todo', 'high', 'chen', 15, 18,
        'Biometric login after the first password login. Fall back to PIN.', []],
      ['App crashes on Android 14 when opening camera', 'bug', 'in_progress', 'highest', 'fatima', 1, 4,
        'Crash in CameraX when permission is denied then granted. 2.1% of Android sessions affected.', [
          ['sofia', 4, 'Crash logs attached from Firebase Crashlytics. Top crash this week.'],
          ['rahul', 3, 'Treat this as a release blocker.'],
        ]],
      ['New home screen design', 'story', 'done', 'medium', 'lucas', null, 30,
        'Cards for recent orders, offers and support. Approved by product.', [
          ['priya', 22, 'Looks great. Approved.'],
        ]],
      ['Implement new home screen (iOS)', 'task', 'in_review', 'medium', 'chen', 3, 16, 'Build the approved design in SwiftUI.', []],
      ['Implement new home screen (Android)', 'task', 'in_progress', 'medium', 'fatima', 5, 16, 'Build the approved design in Jetpack Compose.', []],
      ['Dark mode text is unreadable on order details', 'bug', 'todo', 'medium', 'lucas', 10, 7,
        'Grey text on dark grey background. Need new colour tokens.', []],
      ['Regression test plan for 3.0', 'task', 'todo', 'high', 'sofia', 14, 6,
        'List devices, OS versions and critical flows to test before release.', []],
      ['App size increased to 85 MB', 'bug', 'todo', 'low', null, null, 9,
        'Investigate large assets and unused libraries.', []],
      ['Offline mode for viewing past orders', 'story', 'todo', 'lowest', null, null, 2, 'Cache the last 50 orders locally.', []],
      ['Fix typo on onboarding screen 2', 'bug', 'done', 'lowest', 'lucas', null, 11, '"Recieve" should be "Receive".', []],
    ],
  },
  {
    key: 'OPS',
    name: 'Infrastructure',
    description: 'Cloud infrastructure, CI/CD pipelines, monitoring and security.',
    lead: 'daniel',
    reporter: 'admin',
    issues: [
      ['Migrate services to Kubernetes', 'epic', 'in_progress', 'high', 'daniel', 45, 60,
        'Move all services from VMs to the managed Kubernetes cluster.', [
          ['admin', 58, 'Start with stateless services. Databases stay on managed instances.'],
        ]],
      ['Move API service to Kubernetes', 'task', 'done', 'high', 'omar', null, 50, 'Helm chart, HPA and readiness probes.', [
        ['daniel', 33, 'Running in production for a week with no issues.'],
      ]],
      ['Move worker service to Kubernetes', 'task', 'in_progress', 'medium', 'omar', 7, 30, 'Queue workers with KEDA autoscaling.', []],
      ['Set up centralised logging', 'task', 'done', 'medium', 'emma', null, 90,
        'Ship logs from all services to the logging cluster with 30-day retention.', [
          ['emma', 70, 'Done. Dashboards are shared in the wiki.'],
        ]],
      ['SSL certificate for api.example.com expires in 10 days', 'bug', 'todo', 'highest', 'daniel', 2, 1,
        'Auto-renewal failed because the DNS challenge record was removed.', [
          ['omar', 1, 'I can take this if Daniel is busy with the migration.'],
        ]],
      ['CI pipeline takes 25 minutes', 'task', 'in_review', 'medium', 'omar', 5, 12,
        'Add test parallelism and dependency caching. Goal: under 10 minutes.', [
          ['omar', 2, 'Down to 9 minutes with caching and 4 parallel runners.'],
        ]],
      ['Nightly database backup restore test', 'task', 'todo', 'high', 'daniel', 9, 8, 'Automate a weekly restore to a scratch instance and verify row counts.', []],
      ['Alert fatigue: too many low-priority pages', 'story', 'todo', 'low', null, null, 4, 'Review alert rules and move non-urgent alerts to Slack only.', []],
      ['Rotate leaked staging API key', 'bug', 'done', 'highest', 'emma', null, 100, 'Key was committed to a public gist. Rotated and audited access logs.', []],
    ],
  },
];

// Epic → child issue titles (per project key). Applied on every run, only to issues not yet in an epic.
const EPIC_LINKS = {
  WEB: {
    'Customer self-service portal v2': [
      'As a customer I can track my order status in real time',
      'Build /orders/:id/events API',
      'Dashboard takes 8 seconds to load for large accounts',
      'Redesign account settings page',
      'Add two-factor authentication (TOTP)',
      'Session timeout warning before auto logout',
      'Write end-to-end tests for checkout flow',
    ],
  },
  MOB: {
    'Mobile app 3.0 release': [
      'Push notifications for order updates',
      'Face ID / fingerprint login',
      'App crashes on Android 14 when opening camera',
      'New home screen design',
      'Implement new home screen (iOS)',
      'Implement new home screen (Android)',
      'Dark mode text is unreadable on order details',
      'Regression test plan for 3.0',
    ],
  },
  OPS: {
    'Migrate services to Kubernetes': ['Move API service to Kubernetes', 'Move worker service to Kubernetes', 'CI pipeline takes 25 minutes'],
  },
};

async function linkEpics(db) {
  let linked = 0;
  for (const [key, epics] of Object.entries(EPIC_LINKS)) {
    const [[proj]] = await db.query('SELECT id FROM projects WHERE project_key = ?', [key]);
    if (!proj) continue;
    for (const [epicTitle, childTitles] of Object.entries(epics)) {
      const [[epic]] = await db.query("SELECT id FROM issues WHERE project_id = ? AND type = 'epic' AND title = ?", [proj.id, epicTitle]);
      if (!epic) continue;
      const [r] = await db.query(
        "UPDATE issues SET epic_id = ? WHERE project_id = ? AND type <> 'epic' AND epic_id IS NULL AND title IN (?)",
        [epic.id, proj.id, childTitles]
      );
      linked += r.affectedRows;
    }
  }
  return linked;
}

async function main() {
  const db = await initDb();
  const hash = await bcrypt.hash(PASSWORD, 10);

  // ---- Employees (upsert; existing passwords are kept) ----
  const ids = {};
  for (const [key, name, email, role, code, designation, department, phone, joinedDaysAgo, status] of EMPLOYEES) {
    await db.query(
      `INSERT INTO users (name, email, password_hash, role, employee_code, designation, department, phone, joined_on, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, DATE_SUB(CURDATE(), INTERVAL ? DAY), ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), role = VALUES(role), designation = VALUES(designation),
         department = VALUES(department), phone = VALUES(phone), joined_on = VALUES(joined_on), status = VALUES(status)`,
      [name, email, hash, role, code, designation, department, phone, joinedDaysAgo, status]
    );
    const [[row]] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    ids[key] = row.id;
  }

  // ---- Teams ----
  for (const [name, description, leadKey, memberKeys] of TEAMS) {
    await db.query(
      `INSERT INTO teams (name, description, lead_id) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE description = VALUES(description), lead_id = VALUES(lead_id)`,
      [name, description, ids[leadKey]]
    );
    const [[team]] = await db.query('SELECT id FROM teams WHERE name = ?', [name]);
    await db.query('UPDATE users SET team_id = ? WHERE id IN (?)', [team.id, [leadKey, ...memberKeys].map((k) => ids[k])]);
  }

  // ---- Projects, issues, comments ----
  const created = [];
  for (const proj of PROJECTS) {
    const [exists] = await db.query('SELECT id FROM projects WHERE project_key = ?', [proj.key]);
    if (exists.length) continue;

    const [p] = await db.query(
      'INSERT INTO projects (project_key, name, description, lead_id, created_at) VALUES (?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL 120 DAY))',
      [proj.key, proj.name, proj.description, ids[proj.lead]]
    );
    const positions = {};
    let number = 0;
    for (const [title, type, status, priority, assignee, dueIn, createdAgo, description, comments] of proj.issues) {
      number++;
      positions[status] = (positions[status] ?? -1) + 1;
      const lastActivity = comments.length ? Math.min(...comments.map((c) => c[1])) : createdAgo;
      const [r] = await db.query(
        `INSERT INTO issues (project_id, number, title, description, type, status, priority, assignee_id, reporter_id,
                             position, due_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                 IF(? IS NULL, NULL, DATE_ADD(CURDATE(), INTERVAL ? DAY)),
                 DATE_SUB(NOW(), INTERVAL ? DAY), DATE_SUB(NOW(), INTERVAL ? DAY))`,
        [p.insertId, number, title, description, type, status, priority, assignee ? ids[assignee] : null,
          ids[proj.reporter], positions[status], dueIn, dueIn, createdAgo, lastActivity]
      );
      for (const [author, daysAgo, body] of comments) {
        await db.query(
          'INSERT INTO comments (issue_id, user_id, body, created_at) VALUES (?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))',
          [r.insertId, ids[author], body, daysAgo]
        );
      }
    }
    await db.query('UPDATE projects SET issue_counter = ? WHERE id = ?', [number, p.insertId]);
    created.push(`${proj.key} (${number} issues)`);
  }

  const linked = await linkEpics(db);

  console.log(`Employees: ${EMPLOYEES.length} upserted, teams: ${TEAMS.length} upserted`);
  console.log(`Issues linked to epics: ${linked}`);
  console.log(created.length ? `Projects created: ${created.join(', ')}` : 'Projects already existed, none added');
  console.log(`\nDemo logins (password for new accounts: ${PASSWORD}):`);
  console.log('  Manager    admin@example.com, priya@example.com');
  console.log('  Team Lead  alice@example.com (Core), rahul@example.com (Mobile), sofia@example.com (QA), daniel@example.com (DevOps)');
  console.log('  Member     arjun@example.com, bob@example.com, chen@example.com, vikram@example.com (no team) ...');
  console.log('  Inactive   emma@example.com (cannot log in)');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
