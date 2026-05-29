import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';

export async function getInstallationOctokit(installationId: string): Promise<Octokit> {
  const auth = createAppAuth({
    appId: process.env.GITHUB_APP_ID!,
    privateKey: process.env.GITHUB_APP_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    installationId: Number(installationId),
  });

  const { token } = await auth({ type: 'installation' });

  return new Octokit({ auth: token });
}
