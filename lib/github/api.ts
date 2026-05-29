import { Octokit } from '@octokit/rest';

export function getPublicOctokit(userToken: string): Octokit {
  return new Octokit({ auth: userToken });
}

export async function checkRepoVisibility(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<'public' | 'private' | 'not_found'> {
  try {
    const { data } = await octokit.repos.get({ owner, repo });
    return data.private ? 'private' : 'public';
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'status' in err && (err as { status: number }).status === 404) {
      return 'not_found';
    }
    throw err;
  }
}

export function parseRepoUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+?)(\.git)?$/);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}
