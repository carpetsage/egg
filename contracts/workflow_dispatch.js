// Cloudflare Workers script to trigger the fetch-new-report flow.
// Uses the cron trigger feature.

// Secret environment variable GITHUB_TOKEN required.
const GITHUB_REPO = 'fanaticscripter/Egg';
const WORKFLOW_FILE = 'update-contracts.yml';
const BRANCH = 'master';

async function triggerWorkflow() {
  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': GITHUB_REPO,
      },
      body: JSON.stringify({ ref: BRANCH }),
    }
  );
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
}

addEventListener('scheduled', event => {
  event.waitUntil(triggerWorkflow());
});
