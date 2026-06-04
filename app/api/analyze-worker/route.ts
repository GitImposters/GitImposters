// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import { createAppAuth } from '@octokit/auth-app';
import Groq from 'groq-sdk';
import { sql } from '@/lib/db/client';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

interface ModuleResult {
  score: number;
  findings: string[];
}

export async function POST(request: NextRequest) {
  const { job_id, repo_url, owner, repo, user_id, installation_id, user_token } =
    await request.json();

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

  await sql`UPDATE analysis_jobs SET status = 'running' WHERE id = ${job_id}`;

  try {
    const octokit = await getOctokit(installation_id, user_token);

    const [commitResult, prResult, hygieneResult, consistencyResult, testingResult] =
      await Promise.all([
        analyzeCommitQuality(octokit, owner, repo),
        analyzePRHabits(octokit, owner, repo),
        analyzeRepoHygiene(octokit, owner, repo, groq),
        analyzeContributionConsistency(octokit, owner, repo),
        analyzeTestingAndCICD(octokit, owner, repo),
      ]);

    const authorshipResult = await analyzeCodeAuthorship(octokit, owner, repo, groq);

    const { data: repoData } = await octokit.repos.get({ owner, repo });

    const weightedScore =
      commitResult.score * 0.20 +
      authorshipResult.score * 0.20 +
      prResult.score * 0.15 +
      hygieneResult.score * 0.15 +
      consistencyResult.score * 0.15 +
      testingResult.score * 0.15;

    const imposterScore = Math.round(100 - weightedScore);
    const verdictLabel = getVerdictLabel(imposterScore);

    const aiSummary = await generateAISummary(groq, {
      repoName: `${owner}/${repo}`,
      imposterScore,
      verdictLabel,
      findings: {
        commit_quality: commitResult,
        authorship: authorshipResult,
        pr_review: prResult,
        repo_hygiene: hygieneResult,
        consistency: consistencyResult,
        testing_cicd: testingResult,
      },
    });

    const findingsJson = JSON.stringify({
      commit_quality: commitResult,
      authorship: authorshipResult,
      pr_review: prResult,
      repo_hygiene: hygieneResult,
      consistency: consistencyResult,
      testing_cicd: testingResult,
    });

    const [report] = await sql`
      INSERT INTO reports (
        repo_url, repo_owner, repo_name, repo_description, repo_language,
        repo_stars, repo_forks, is_private,
        final_imposter_score, verdict_label,
        commit_quality_score, authorship_score, pr_review_score,
        repo_hygiene_score, consistency_score, testing_cicd_score,
        findings_json, ai_summary, analyzed_at, cached_until
      ) VALUES (
        ${repo_url}, ${owner}, ${repo},
        ${repoData.description ?? null}, ${repoData.language ?? null},
        ${repoData.stargazers_count}, ${repoData.forks_count}, ${repoData.private},
        ${imposterScore}, ${verdictLabel},
        ${commitResult.score}, ${authorshipResult.score}, ${prResult.score},
        ${hygieneResult.score}, ${consistencyResult.score}, ${testingResult.score},
        ${findingsJson}::jsonb, ${aiSummary},
        NOW(), NOW() + INTERVAL '24 hours'
      )
      RETURNING *
    `;

    await sql`
      INSERT INTO search_logs (searcher_user_id, target_repo_url, target_repo_owner, report_id, final_imposter_score)
      VALUES (${user_id}, ${repo_url}, ${owner}, ${report.id}, ${imposterScore})
    `;

    await sql`
      UPDATE analysis_jobs
      SET status = 'complete', report_id = ${report.id}, completed_at = NOW()
      WHERE id = ${job_id}
    `;

    return NextResponse.json({ ok: true, report_id: report.id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await sql`
      UPDATE analysis_jobs SET status = 'failed', error_message = ${message} WHERE id = ${job_id}
    `;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── Module 1: Commit Quality ────────────────────────────────────────────────

async function analyzeCommitQuality(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<ModuleResult> {
  const findings: string[] = [];

  const commits = await octokit.paginate(
    octokit.repos.listCommits,
    { owner, repo, per_page: 100 },
    (response, done) => {
      if (response.data.length >= 500) done();
      return response.data;
    }
  );
  const sample = commits.slice(0, 500);

  const vaguePatterns =
    /^(fix|update|wip|test|commit|changes|stuff|misc|asdf|temp|patch|hotfix|edit|tweaks?)\.?$/i;
  let vagueCount = 0;
  let emptyCount = 0;
  let largeCommitCount = 0;

  for (const commit of sample) {
    const msg = commit.commit.message.split('\n')[0].trim();
    if (!msg) emptyCount++;
    else if (vaguePatterns.test(msg)) vagueCount++;
  }

  const sampleForSize = sample.slice(0, 20);
  for (const commit of sampleForSize) {
    try {
      const { data } = await octokit.repos.getCommit({ owner, repo, ref: commit.sha });
      const filesChanged = data.files?.length ?? 0;
      const linesChanged = (data.stats?.additions ?? 0) + (data.stats?.deletions ?? 0);
      if (filesChanged > 50 || linesChanged > 5000) largeCommitCount++;
    } catch { /* skip inaccessible commits */ }
  }

  const vagueRatio = vagueCount / sample.length;
  const emptyRatio = emptyCount / sample.length;
  const largeRatio = largeCommitCount / sampleForSize.length;

  if (emptyRatio > 0.05)
    findings.push(`${Math.round(emptyRatio * 100)}% of commits have empty messages`);
  if (vagueRatio > 0.3)
    findings.push(`${Math.round(vagueRatio * 100)}% of commits have vague single-word messages`);
  if (largeRatio > 0.3)
    findings.push(`${Math.round(largeRatio * 100)}% of sampled commits are unusually large`);

  const conventionalPattern =
    /^(feat|fix|chore|docs|style|refactor|test|ci|build|perf|revert)(\(.+\))?:/i;
  const conventionalRatio =
    sample.filter((c) =>
      conventionalPattern.test(c.commit.message.split('\n')[0])
    ).length / sample.length;

  if (conventionalRatio > 0.5)
    findings.push(`✓ ${Math.round(conventionalRatio * 100)}% of commits follow conventional commit format`);

  let score = 100;
  score -= emptyRatio * 50;
  score -= vagueRatio * 40;
  score -= largeRatio * 30;
  score += conventionalRatio * 20;
  score = Math.max(0, Math.min(100, Math.round(score)));

  return { score, findings };
}

// ─── Module 2: Code Authorship (uses Groq) ───────────────────────────────────

async function analyzeCodeAuthorship(
  octokit: Octokit,
  owner: string,
  repo: string,
  groq: Groq
): Promise<ModuleResult> {
  const { data: tree } = await octokit.git.getTree({
    owner, repo, tree_sha: 'HEAD', recursive: '1',
  });

  const sourceExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.java', '.rs', '.cpp', '.c'];
  const sourceFiles = tree.tree
    .filter((f) => f.type === 'blob' && sourceExtensions.some((ext) => f.path?.endsWith(ext)))
    .slice(0, 20);

  const fileContents: string[] = [];
  for (const file of sourceFiles) {
    try {
      const { data } = await octokit.repos.getContent({ owner, repo, path: file.path! });
      if ('content' in data) {
        const content = Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf8');
        fileContents.push(`// FILE: ${file.path}\n${content.slice(0, 1500)}`);
      }
    } catch { /* skip unreadable files */ }
  }

  if (fileContents.length === 0) {
    return { score: 50, findings: ['Could not sample source files for authorship analysis'] };
  }

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a senior software engineering reviewer. Respond ONLY with valid JSON. No markdown, no explanation outside the JSON.',
        },
        {
          role: 'user',
          content: `Analyze the following source code files sampled from a GitHub repository.
Return a JSON object: { "score": <0-100>, "findings": ["finding 1", "finding 2", ...] }

Score 0 = many red flags (inconsistent style, AI-generated, copy-pasted, multiple authors with no cohesion)
Score 100 = clearly written by one skilled developer with consistent personal style and genuine iteration

Source files:
${fileContents.join('\n\n---\n\n')}`,
        },
      ],
      max_tokens: 500,
    });

    const raw = completion.choices[0].message.content ?? '';
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return { score: parsed.score ?? 50, findings: parsed.findings ?? [] };
  } catch {
    return { score: 50, findings: ['AI authorship analysis could not be completed'] };
  }
}

// ─── Module 3: PR & Review Habits ────────────────────────────────────────────

async function analyzePRHabits(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<ModuleResult> {
  const findings: string[] = [];

  const prs = await octokit.paginate(
    octokit.pulls.list,
    { owner, repo, state: 'closed', per_page: 100 },
    (r, done) => {
      if (r.data.length >= 200) done();
      return r.data;
    }
  );

  if (prs.length === 0) {
    return { score: 60, findings: ['No pull requests found — likely a solo project or direct commits only'] };
  }

  let noDescription = 0;
  let quickMerge = 0;
  let selfMerged = 0;
  let noReview = 0;

  for (const pr of prs) {
    if (!pr.body || pr.body.trim().length < 10) noDescription++;
    if (pr.merged_at && pr.created_at) {
      const diffMs = new Date(pr.merged_at).getTime() - new Date(pr.created_at).getTime();
      if (diffMs < 5 * 60 * 1000) quickMerge++;
    }
    if (pr.user?.login === (pr as { merged_by?: { login?: string } }).merged_by?.login) selfMerged++;
  }

  const samplePRs = prs.slice(0, 30);
  for (const pr of samplePRs) {
    try {
      const { data: reviews } = await octokit.pulls.listReviews({ owner, repo, pull_number: pr.number });
      if (reviews.length === 0) noReview++;
    } catch { /* skip */ }
  }

  const total = prs.length;
  const noDescRatio = noDescription / total;
  const quickMergeRatio = quickMerge / total;
  const selfMergedRatio = selfMerged / total;
  const noReviewRatio = noReview / Math.max(samplePRs.length, 1);

  if (noDescRatio > 0.5) findings.push(`${Math.round(noDescRatio * 100)}% of PRs have no description`);
  if (quickMergeRatio > 0.3) findings.push(`${Math.round(quickMergeRatio * 100)}% of PRs were merged within 5 minutes`);
  if (selfMergedRatio === 1) findings.push('100% of PRs are self-merged with no external reviewers');
  else if (selfMergedRatio > 0.8) findings.push(`${Math.round(selfMergedRatio * 100)}% of PRs are self-merged`);
  if (noReviewRatio > 0.8) findings.push('Most PRs received no code review activity');

  let score = 100;
  score -= noDescRatio * 25;
  score -= quickMergeRatio * 30;
  score -= selfMergedRatio > 0.9 ? 20 : 0;
  score -= noReviewRatio * 25;
  score = Math.max(0, Math.min(100, Math.round(score)));

  return { score, findings };
}

// ─── Module 4: Repo Hygiene (uses Groq) ──────────────────────────────────────

async function analyzeRepoHygiene(
  octokit: Octokit,
  owner: string,
  repo: string,
  groq: Groq
): Promise<ModuleResult> {
  const findings: string[] = [];
  let score = 100;

  const filesToCheck = ['README.md', '.gitignore', 'LICENSE', 'CONTRIBUTING.md'];
  const presentFiles: string[] = [];

  for (const file of filesToCheck) {
    try {
      await octokit.repos.getContent({ owner, repo, path: file });
      presentFiles.push(file);
    } catch {
      findings.push(`Missing ${file}`);
      score -= 10;
    }
  }

  let readmeScore = 50;
  if (presentFiles.includes('README.md')) {
    try {
      const { data } = await octokit.repos.getContent({ owner, repo, path: 'README.md' });
      if ('content' in data) {
        const readmeContent = Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf8').slice(0, 3000);
        const completion = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'You are a documentation reviewer. Respond ONLY with valid JSON. No markdown.' },
            {
              role: 'user',
              content: `Rate this README. Return JSON: { "score": <0-100>, "findings": ["..."] }
Score 0 = empty/useless, Score 100 = excellent (explains purpose, install steps, usage, contribution guide).

README content:
${readmeContent}`,
            },
          ],
          max_tokens: 300,
        });
        const raw = completion.choices[0].message.content ?? '';
        const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
        readmeScore = parsed.score ?? 50;
        findings.push(...(parsed.findings ?? []));
      }
    } catch { /* fall back to readmeScore = 50 */ }
  }

  const { data: rootContents } = await octokit.repos.getContent({ owner, repo, path: '' });
  if (Array.isArray(rootContents)) {
    const sourceInRoot = rootContents
      .filter((f) => f.type === 'file')
      .filter((f) => ['.ts', '.js', '.py', '.go'].some((ext) => f.name.endsWith(ext)));
    if (sourceInRoot.length > 10) {
      findings.push(`${sourceInRoot.length} source files dumped directly in root with no folder structure`);
      score -= 15;
    }
  }

  score = Math.round((score + readmeScore) / 2);
  score = Math.max(0, Math.min(100, score));

  return { score, findings };
}

// ─── Module 5: Contribution Consistency ──────────────────────────────────────

async function analyzeContributionConsistency(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<ModuleResult> {
  const findings: string[] = [];

  const commits = await octokit.paginate(
    octokit.repos.listCommits,
    { owner, repo, per_page: 100 },
    (r, done) => {
      if (r.data.length >= 500) done();
      return r.data;
    }
  );

  if (commits.length < 5) {
    return { score: 60, findings: ['Too few commits to assess contribution consistency'] };
  }

  const timestamps = commits
    .map((c) => new Date(c.commit.author?.date ?? '').getTime())
    .filter(Boolean)
    .sort((a, b) => a - b);

  const repoAgeDays =
    (timestamps[timestamps.length - 1] - timestamps[0]) / (1000 * 60 * 60 * 24);

  let score = 100;

  if (repoAgeDays < 3 && commits.length > 20) {
    findings.push(`${commits.length} commits all made within ${Math.round(repoAgeDays)} days — entire project appears to have been uploaded at once`);
    score -= 40;
  }

  const commitsByDay = new Map<string, number>();
  for (const ts of timestamps) {
    const day = new Date(ts).toISOString().split('T')[0];
    commitsByDay.set(day, (commitsByDay.get(day) ?? 0) + 1);
  }

  const maxInOneDay = Math.max(...commitsByDay.values());
  if (maxInOneDay > 50) {
    findings.push(`${maxInOneDay} commits in a single day — suggests bulk upload or cramming`);
    score -= 25;
  }

  const dayKeys = Array.from(commitsByDay.keys()).sort();
  let gapBeforeBurst = false;
  for (let i = 1; i < dayKeys.length; i++) {
    const gap =
      (new Date(dayKeys[i]).getTime() - new Date(dayKeys[i - 1]).getTime()) /
      (1000 * 60 * 60 * 24);
    const burstSize = commitsByDay.get(dayKeys[i]) ?? 0;
    if (gap > 30 && burstSize > 20) {
      gapBeforeBurst = true;
      findings.push(`${Math.round(gap)}-day gap followed by ${burstSize} commits in one day`);
    }
  }
  if (gapBeforeBurst) score -= 20;

  if (repoAgeDays > 30 && maxInOneDay < 15 && !gapBeforeBurst) {
    findings.push('✓ Steady, consistent contribution pattern over time');
    score += 10;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, findings };
}

// ─── Module 6: Testing & CI/CD ───────────────────────────────────────────────

async function analyzeTestingAndCICD(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<ModuleResult> {
  const findings: string[] = [];
  let score = 0;

  const { data: tree } = await octokit.git.getTree({
    owner, repo, tree_sha: 'HEAD', recursive: '1',
  });
  const allFiles = tree.tree.filter((f) => f.type === 'blob').map((f) => f.path ?? '');

  const testPatterns = [/\/__tests__\//, /\/tests\//, /\/spec\//, /\.test\.[jt]sx?$/, /\.spec\.[jt]sx?$/, /_test\.go$/, /test_.*\.py$/];
  const testFiles = allFiles.filter((f) => testPatterns.some((p) => p.test(f)));
  const sourceExts = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.java', '.rs'];
  const sourceFiles = allFiles.filter((f) => sourceExts.some((ext) => f.endsWith(ext)) && !testPatterns.some((p) => p.test(f)));
  const testRatio = sourceFiles.length > 0 ? testFiles.length / sourceFiles.length : 0;

  if (testFiles.length === 0) {
    findings.push('No test files detected in the repository');
  } else {
    findings.push(`✓ ${testFiles.length} test files found (${Math.round(testRatio * 100)}% test-to-source ratio)`);
    score += Math.min(50, testRatio * 100);
  }

  const ciPatterns = ['.github/workflows', '.travis.yml', 'circle.yml', '.circleci/config.yml', 'Jenkinsfile', '.gitlab-ci.yml', 'azure-pipelines.yml', 'Dockerfile', 'docker-compose.yml', '.github/actions'];
  const ciFiles = allFiles.filter((f) => ciPatterns.some((p) => f.includes(p)));

  if (ciFiles.length === 0) {
    findings.push('No CI/CD configuration detected');
  } else {
    findings.push(`✓ CI/CD configured: ${ciFiles.slice(0, 3).join(', ')}`);
    score += 50;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, findings };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getVerdictLabel(imposterScore: number): string {
  if (imposterScore <= 20) return '✅ Solid Engineer';
  if (imposterScore <= 40) return '🟡 Some Concerns';
  if (imposterScore <= 60) return '🟠 Suspicious';
  if (imposterScore <= 80) return '🔴 Likely Imposter';
  return '🚨 Almost Certainly an Imposter';
}

async function generateAISummary(
  groq: Groq,
  data: { repoName: string; imposterScore: number; verdictLabel: string; findings: unknown }
): Promise<string> {
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a hiring consultant writing brief, plain-English developer assessments. Be direct and specific. Write 2-3 sentences only. No bullet points.' },
        {
          role: 'user',
          content: `Write a 2-3 sentence plain-English summary for a recruiter about this GitHub repository analysis.

Repo: ${data.repoName}
Imposter Score: ${data.imposterScore}/100
Verdict: ${data.verdictLabel}

Key findings: ${JSON.stringify(data.findings, null, 2)}

Be direct. Mention the 1-2 most significant signals.`,
        },
      ],
      max_tokens: 200,
    });
    return completion.choices[0].message.content?.trim() ?? '';
  } catch {
    return `This repository received an imposter score of ${data.imposterScore}/100 (${data.verdictLabel}). Analysis could not generate a detailed summary.`;
  }
}

async function getOctokit(
  installationId: string | null,
  userToken: string | null
): Promise<Octokit> {
  if (installationId) {
    const auth = createAppAuth({
      appId: process.env.GITHUB_APP_ID!,
      privateKey: process.env.GITHUB_APP_PRIVATE_KEY!.replace(/\\n/g, '\n'),
      installationId: Number(installationId),
    });
    const { token } = await auth({ type: 'installation' });
    return new Octokit({ auth: token });
  }
  return new Octokit({ auth: userToken ?? process.env.GITHUB_PAT ?? undefined });
}
