export async function triggerGitHubRebuild(flagKey: string): Promise<void> {
  const token = process.env.GITHUB_PAT;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;

  if (!token || !owner || !repo) {
    console.warn('GitHub webhook not configured — skipping rebuild trigger');
    return;
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/dispatches`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({
      event_type: 'flag-changed',
      client_payload: {
        flag: flagKey,
        timestamp: new Date().toISOString(),
      },
    }),
  });

  if (!response.ok) {
    console.error(
      `Failed to trigger GitHub rebuild: ${response.status} ${response.statusText}`
    );
  } else {
    console.log(`Triggered rebuild for flag: ${flagKey}`);
  }
}
