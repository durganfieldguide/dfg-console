/**
 * DFG Relay Worker
 * 
 * Enables PM Team to create GitHub issues via HTTP POST.
 * Eliminates copy-paste handoffs between Claude Web and GitHub.
 */

interface Env {
  GITHUB_TOKEN: string;
  RELAY_TOKEN: string;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
}

interface DirectivePayload {
  to: 'dev' | 'qa' | 'pm';
  title: string;
  labels: string[];
  body: string;
  assignees?: string[];
}

interface CommentPayload {
  issue: number;
  body: string;
}

interface ClosePayload {
  issue: number;
  comment?: string;
}

interface LabelsPayload {
  issue: number;
  add?: string[];
  remove?: string[];
}

interface GitHubIssueResponse {
  number: number;
  html_url: string;
  title: string;
}

// CORS configuration (#98)
const ALLOWED_ORIGINS = [
  'https://app.durganfieldguide.com',
  'https://durganfieldguide.com',
  'http://localhost:3000',
];

function getCorsOrigin(request: Request): string {
  const origin = request.headers.get('Origin');
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return origin;
  }
  return ALLOWED_ORIGINS[0];
}

// Store request for CORS in responses
let currentRequest: Request | null = null;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    currentRequest = request;

    // CORS headers for preflight (#98: restricted origins)
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': getCorsOrigin(request),
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Route handling
    switch (url.pathname) {
      case '/health':
        return handleHealth();

      case '/directive':
        return handleDirective(request, env);

      case '/comment':
        return handleComment(request, env);

      case '/close':
        return handleClose(request, env);

      case '/labels':
        return handleLabels(request, env);

      default:
        return jsonResponse({ error: 'Not found' }, 404);
    }
  },
};

/**
 * Health check endpoint
 */
function handleHealth(): Response {
  return jsonResponse({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Create GitHub issue from directive
 */
async function handleDirective(request: Request, env: Env): Promise<Response> {
  // Method check
  if (request.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }

  // Auth check
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || authHeader !== `Bearer ${env.RELAY_TOKEN}`) {
    return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
  }

  // Parse payload
  let payload: DirectivePayload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON' }, 400);
  }

  // Validate required fields
  if (!payload.title || !payload.body || !payload.to) {
    return jsonResponse({
      success: false,
      error: 'Missing required fields: title, body, to'
    }, 400);
  }

  // Build issue body with metadata header
  const issueBody = buildIssueBody(payload);

  // Create GitHub issue
  try {
    const issue = await createGitHubIssue(env, {
      title: payload.title,
      body: issueBody,
      labels: payload.labels || [],
      assignees: payload.assignees || [],
    });

    return jsonResponse({
      success: true,
      issue: issue.number,
      url: issue.html_url,
    });
  } catch (error) {
    console.error('GitHub API error:', error);
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : 'GitHub API failed',
    }, 500);
  }
}

/**
 * Build issue body with metadata header, planning requirement, and suggested commands (#164, #166)
 */
function buildIssueBody(payload: DirectivePayload): string {
  const header = [
    '<!-- DFG Relay: Auto-generated issue -->',
    `**Routed to:** ${payload.to.toUpperCase()} Team`,
    `**Created:** ${new Date().toISOString()}`,
    '',
    '---',
    '',
  ].join('\n');

  const planningSection = requiresPlanning(payload.labels)
    ? '\n\n---\n\n### Planning Required\n\n⚠️ **This issue requires planning before implementation.**\n\nRun `/project:plan` to create an implementation plan before starting work.\n\n'
    : '';

  const suggestedCommands = getSuggestedCommands(payload.labels);
  const commandsSection = suggestedCommands.length > 0
    ? '\n\n---\n\n### Suggested Commands\n\n' + suggestedCommands.join('\n') + '\n'
    : '';

  return header + payload.body + planningSection + commandsSection;
}

/**
 * Check if issue requires planning based on labels (#166)
 * Planning required if: points >= 3 OR prio:P0
 */
function requiresPlanning(labels: string[]): boolean {
  for (const label of labels) {
    // Check for prio:P0
    if (label === 'prio:P0') {
      return true;
    }

    // Check for points >= 3
    const pointsMatch = label.match(/^points:(\d+)$/);
    if (pointsMatch) {
      const points = parseInt(pointsMatch[1], 10);
      if (points >= 3) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Get suggested commands based on labels (#164)
 */
function getSuggestedCommands(labels: string[]): string[] {
  const commands: string[] = [];

  for (const label of labels) {
    if (label === 'component:dfg-relay') {
      commands.push('```bash\ncd workers/dfg-relay\nnpx wrangler deploy\n```');
    } else if (label === 'component:dfg-api') {
      commands.push('```bash\ncd workers/dfg-api\nnpm run test\nnpx tsc --noEmit\nnpx wrangler deploy\n```');
    } else if (label === 'component:dfg-scout') {
      commands.push('```bash\ncd workers/dfg-scout\nnpm run test\nnpx tsc --noEmit\nnpx wrangler deploy\n```');
    } else if (label === 'component:dfg-analyst') {
      commands.push('```bash\ncd workers/dfg-analyst\nnpm run test\nnpx tsc --noEmit\nnpx wrangler deploy\n```');
    } else if (label === 'component:dfg-app') {
      commands.push('```bash\ncd apps/dfg-app\nnpm run lint\nnpm run type-check\nnpm run build\n```');
    }
  }

  return commands;
}

/**
 * Add comment to existing GitHub issue (#165)
 */
async function handleComment(request: Request, env: Env): Promise<Response> {
  // Method check
  if (request.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }

  // Auth check
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || authHeader !== `Bearer ${env.RELAY_TOKEN}`) {
    return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
  }

  // Parse payload
  let payload: CommentPayload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON' }, 400);
  }

  // Validate required fields
  if (!payload.issue || !payload.body) {
    return jsonResponse({
      success: false,
      error: 'Missing required fields: issue, body'
    }, 400);
  }

  // Create GitHub comment
  try {
    await createGitHubComment(env, payload.issue, payload.body);

    return jsonResponse({
      success: true,
      issue: payload.issue,
    });
  } catch (error) {
    console.error('GitHub API error:', error);
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : 'GitHub API failed',
    }, 500);
  }
}

/**
 * Close GitHub issue (#168)
 */
async function handleClose(request: Request, env: Env): Promise<Response> {
  // Method check
  if (request.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }

  // Auth check
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || authHeader !== `Bearer ${env.RELAY_TOKEN}`) {
    return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
  }

  // Parse payload
  let payload: ClosePayload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON' }, 400);
  }

  // Validate required fields
  if (!payload.issue) {
    return jsonResponse({
      success: false,
      error: 'Missing required field: issue'
    }, 400);
  }

  // Close GitHub issue (with optional comment)
  try {
    // Add comment if provided
    if (payload.comment) {
      await createGitHubComment(env, payload.issue, payload.comment);
    }

    // Close the issue
    await closeGitHubIssue(env, payload.issue);

    return jsonResponse({
      success: true,
      issue: payload.issue,
    });
  } catch (error) {
    console.error('GitHub API error:', error);
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : 'GitHub API failed',
    }, 500);
  }
}

/**
 * Update labels on GitHub issue (#179)
 */
async function handleLabels(request: Request, env: Env): Promise<Response> {
  // Method check
  if (request.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }

  // Auth check
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || authHeader !== `Bearer ${env.RELAY_TOKEN}`) {
    return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
  }

  // Parse payload
  let payload: LabelsPayload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON' }, 400);
  }

  // Validate required fields
  if (!payload.issue) {
    return jsonResponse({
      success: false,
      error: 'Missing required field: issue'
    }, 400);
  }

  // At least one operation required
  if (!payload.add && !payload.remove) {
    return jsonResponse({
      success: false,
      error: 'Must specify at least one of: add, remove'
    }, 400);
  }

  // Update labels on GitHub issue
  try {
    // Remove labels first (if specified)
    if (payload.remove && payload.remove.length > 0) {
      for (const label of payload.remove) {
        await removeGitHubLabel(env, payload.issue, label);
      }
    }

    // Add labels (if specified)
    if (payload.add && payload.add.length > 0) {
      await addGitHubLabels(env, payload.issue, payload.add);
    }

    // Fetch updated labels
    const labels = await getGitHubLabels(env, payload.issue);

    return jsonResponse({
      success: true,
      issue: payload.issue,
      labels,
    });
  } catch (error) {
    console.error('GitHub API error:', error);
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : 'GitHub API failed',
    }, 500);
  }
}

/**
 * Create issue via GitHub REST API
 */
async function createGitHubIssue(
  env: Env,
  params: {
    title: string;
    body: string;
    labels: string[];
    assignees: string[];
  }
): Promise<GitHubIssueResponse> {
  const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/issues`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `token ${env.GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'dfg-relay-worker',
      'Accept': 'application/vnd.github.v3+json',
    },
    body: JSON.stringify({
      title: params.title,
      body: params.body,
      labels: params.labels,
      assignees: params.assignees,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`GitHub API ${response.status}: ${errorBody}`);
  }

  return response.json();
}

/**
 * Add comment to GitHub issue via REST API (#165)
 */
async function createGitHubComment(
  env: Env,
  issueNumber: number,
  body: string
): Promise<void> {
  const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/issues/${issueNumber}/comments`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `token ${env.GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'dfg-relay-worker',
      'Accept': 'application/vnd.github.v3+json',
    },
    body: JSON.stringify({ body }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`GitHub API ${response.status}: ${errorBody}`);
  }
}

/**
 * Close GitHub issue via REST API (#168)
 */
async function closeGitHubIssue(
  env: Env,
  issueNumber: number
): Promise<void> {
  const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/issues/${issueNumber}`;

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `token ${env.GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'dfg-relay-worker',
      'Accept': 'application/vnd.github.v3+json',
    },
    body: JSON.stringify({ state: 'closed' }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`GitHub API ${response.status}: ${errorBody}`);
  }
}

/**
 * Add labels to GitHub issue via REST API (#179)
 */
async function addGitHubLabels(
  env: Env,
  issueNumber: number,
  labels: string[]
): Promise<void> {
  const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/issues/${issueNumber}/labels`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `token ${env.GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'dfg-relay-worker',
      'Accept': 'application/vnd.github.v3+json',
    },
    body: JSON.stringify({ labels }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`GitHub API ${response.status}: ${errorBody}`);
  }
}

/**
 * Remove label from GitHub issue via REST API (#179)
 */
async function removeGitHubLabel(
  env: Env,
  issueNumber: number,
  label: string
): Promise<void> {
  const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/issues/${issueNumber}/labels/${encodeURIComponent(label)}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `token ${env.GITHUB_TOKEN}`,
      'User-Agent': 'dfg-relay-worker',
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`GitHub API ${response.status}: ${errorBody}`);
  }
}

/**
 * Get labels for GitHub issue via REST API (#179)
 */
async function getGitHubLabels(
  env: Env,
  issueNumber: number
): Promise<string[]> {
  const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/issues/${issueNumber}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `token ${env.GITHUB_TOKEN}`,
      'User-Agent': 'dfg-relay-worker',
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`GitHub API ${response.status}: ${errorBody}`);
  }

  const issue = await response.json() as { labels: Array<{ name: string }> };
  return issue.labels.map(l => l.name);
}

/**
 * Helper: JSON response with CORS (#98: restricted origins)
 */
function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': currentRequest ? getCorsOrigin(currentRequest) : ALLOWED_ORIGINS[0],
    },
  });
}
