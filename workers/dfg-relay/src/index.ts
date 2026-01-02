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

interface GitHubIssueResponse {
  number: number;
  html_url: string;
  title: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // CORS headers for preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
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
  if (!payload.title || !payload.body) {
    return jsonResponse({ 
      success: false, 
      error: 'Missing required fields: title, body' 
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
 * Build issue body with metadata header
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

  return header + payload.body;
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
 * Helper: JSON response with CORS
 */
function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
