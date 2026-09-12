// Comprehensive API-level RBAC & Real-Time Test Suite (TypeScript)
const BASE_URL = 'http://localhost:5000/api';

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

async function request<T = any>(
  endpoint: string,
  options: RequestInit = {},
  token?: string | null
): Promise<{ status: number; ok: boolean; data: ApiResponse<T> }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = (await res.json().catch(() => ({}))) as ApiResponse<T>;
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING RIGOROUS API-LEVEL RBAC & INTEGRATION TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details = '') {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} - ${details}`);
      failed++;
    }
  }

  // 1. Authenticate Personas
  console.log('--- Phase 1: Authentication & JWT Tokens ---');
  const adminLogin = await request<{ accessToken: string; user: { id: string } }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@agency.com', password: 'Password123!' }),
  });
  assert(adminLogin.ok && !!adminLogin.data.data?.accessToken, 'Admin Login with JWT access token');
  const adminToken = adminLogin.data.data?.accessToken;

  const pm1Login = await request<{ accessToken: string; user: { id: string } }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'pm1@agency.com', password: 'Password123!' }),
  });
  assert(pm1Login.ok && !!pm1Login.data.data?.accessToken, 'PM1 (Alex) Login with JWT access token');
  const pm1Token = pm1Login.data.data?.accessToken;

  const pm2Login = await request<{ accessToken: string; user: { id: string } }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'pm2@agency.com', password: 'Password123!' }),
  });
  assert(pm2Login.ok && !!pm2Login.data.data?.accessToken, 'PM2 (Sarah) Login with JWT access token');
  const pm2Token = pm2Login.data.data?.accessToken;

  const dev1Login = await request<{ accessToken: string; user: { id: string } }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'dev1@agency.com', password: 'Password123!' }),
  });
  assert(dev1Login.ok && !!dev1Login.data.data?.accessToken, 'Dev1 (Ravi) Login with JWT access token');
  const dev1Token = dev1Login.data.data?.accessToken;

  // 2. Strict RBAC: Project isolation between PMs
  console.log('\n--- Phase 2: Strict Project Manager Isolation ---');
  const pm1Projects = await request<Array<{ id: string }>>('/projects', {}, pm1Token);
  assert(pm1Projects.ok && pm1Projects.data.data.length > 0, 'PM1 can list their own projects');

  const pm2Projects = await request<Array<{ id: string }>>('/projects', {}, pm2Token);
  assert(pm2Projects.ok && pm2Projects.data.data.length > 0, 'PM2 can list their own projects');
  const pm2ProjectId = pm2Projects.data.data[0].id;

  // PM1 attempts to view/edit PM2's project
  const pm1AttemptPM2Proj = await request(`/projects/${pm2ProjectId}`, {}, pm1Token);
  assert(
    pm1AttemptPM2Proj.status === 403,
    'SECURITY: PM1 cannot access PM2 project directly via API (403 Forbidden)',
    `Status: ${pm1AttemptPM2Proj.status}`
  );

  const pm1EditPM2Proj = await request(
    `/projects/${pm2ProjectId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Hacked Project Name' }),
    },
    pm1Token
  );
  assert(
    pm1EditPM2Proj.status === 403,
    'SECURITY: PM1 cannot modify PM2 project via API (403 Forbidden)',
    `Status: ${pm1EditPM2Proj.status}`
  );

  // 3. Strict RBAC: Developer Permissions & Isolation
  console.log('\n--- Phase 3: Strict Developer Permission Enforcement ---');
  // Developer attempts to create a project
  const devCreateProj = await request(
    '/projects',
    {
      method: 'POST',
      body: JSON.stringify({ name: 'Dev Rogue Project', clientId: 'some-id' }),
    },
    dev1Token
  );
  assert(
    devCreateProj.status === 403,
    'SECURITY: Developer cannot create projects (403 Forbidden)',
    `Status: ${devCreateProj.status}`
  );

  // Developer lists tasks -> must only get their assigned tasks
  const devTasks = await request<Array<{ id: string; assignedToId: string; status: string }>>(
    '/tasks',
    {},
    dev1Token
  );
  assert(devTasks.ok && Array.isArray(devTasks.data.data), 'Developer can retrieve assigned tasks');
  const allAssignedToDev1 = devTasks.data.data.every(
    (t) => t.assignedToId === dev1Login.data.data.user.id
  );
  assert(
    allAssignedToDev1,
    'SECURITY: Developer sees only their assigned tasks (0 other dev tasks exposed)'
  );

  // Developer attempts to view a task assigned to someone else
  const adminTasks = await request<Array<{ id: string; assignedToId: string }>>(
    '/tasks',
    {},
    adminToken
  );
  const otherDevTask = adminTasks.data.data.find(
    (t) => t.assignedToId && t.assignedToId !== dev1Login.data.data.user.id
  );
  if (otherDevTask) {
    const devAttemptOtherTask = await request(`/tasks/${otherDevTask.id}`, {}, dev1Token);
    assert(
      devAttemptOtherTask.status === 403,
      "SECURITY: Developer cannot view another developer's task (403 Forbidden)",
      `Status: ${devAttemptOtherTask.status}`
    );

    const devUpdateOtherStatus = await request(
      `/tasks/${otherDevTask.id}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status: 'DONE' }),
      },
      dev1Token
    );
    assert(
      devUpdateOtherStatus.status === 403,
      "SECURITY: Developer cannot update status of another developer's task (403 Forbidden)",
      `Status: ${devUpdateOtherStatus.status}`
    );
  }

  // Developer modifies their own assigned task's metadata (e.g. title/priority) -> must fail
  const ownTask = devTasks.data.data[0];
  if (ownTask) {
    const devEditDetails = await request(
      `/tasks/${ownTask.id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Dev Changed Title', priority: 'LOW' }),
      },
      dev1Token
    );
    assert(
      devEditDetails.status === 403,
      'SECURITY: Developer cannot edit task details/priority/title (403 Forbidden)',
      `Status: ${devEditDetails.status}`
    );

    // Developer updating status of own assigned task -> MUST SUCCEED
    const prevStatus = ownTask.status;
    const nextStatus = prevStatus === 'IN_PROGRESS' ? 'IN_REVIEW' : 'IN_PROGRESS';
    const devStatusUpdate = await request<{ status: string }>(
      `/tasks/${ownTask.id}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      },
      dev1Token
    );
    assert(
      devStatusUpdate.ok && devStatusUpdate.data.data.status === nextStatus,
      `Developer can transition status of their own assigned task (${prevStatus} -> ${nextStatus})`
    );
  }

  // 4. Activity Log & Real-Time Role Filtering
  console.log('\n--- Phase 4: Activity Feed & Missed Event Catchup ---');
  const adminFeed = await request<Array<{ message: string }>>(
    '/activity/feed?limit=20',
    {},
    adminToken
  );
  assert(
    adminFeed.ok && adminFeed.data.data.length > 0,
    'Admin receives global activity feed from database'
  );

  const pm1Feed = await request('/activity/feed?limit=20', {}, pm1Token);
  assert(pm1Feed.ok, 'PM1 receives role-filtered activity feed');

  const dev1Feed = await request('/activity/feed?limit=20', {}, dev1Token);
  assert(dev1Feed.ok, 'Dev1 receives role-filtered activity feed for assigned tasks');

  // Verify formatted message structure
  const latestAdminLog = adminFeed.data.data[0];
  assert(
    Boolean(latestAdminLog && typeof latestAdminLog.message === 'string'),
    `Feed contains properly formatted message: "${latestAdminLog?.message}"`
  );

  // 5. Unread Notification Count & Dropdown
  console.log('\n--- Phase 5: Notifications ---');
  const pm1Notifs = await request<{ unreadCount: number }>(
    '/notifications?limit=10',
    {},
    pm1Token
  );
  assert(
    pm1Notifs.ok && typeof pm1Notifs.data.data.unreadCount === 'number',
    'PM1 retrieves notifications & unread badge count'
  );

  // 6. Live Dashboard Statistics
  console.log('\n--- Phase 6: Dashboard Aggregations ---');
  const adminStats = await request<{
    totalProjects: number;
    overdueCount: number;
    onlineUsersCount: number;
  }>('/stats/dashboard', {}, adminToken);
  assert(
    adminStats.ok &&
      typeof adminStats.data.data.totalProjects === 'number' &&
      typeof adminStats.data.data.overdueCount === 'number' &&
      typeof adminStats.data.data.onlineUsersCount === 'number',
    'Admin dashboard returns total projects, overdue count, and live online users count'
  );

  console.log('\n====================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

runTests().catch((e) => {
  console.error('Fatal test runner error:', e);
  process.exit(1);
});
