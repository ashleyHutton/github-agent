const { execSync } = require('child_process');

const GITHUB_ORG = process.env.GITHUB_ORG || 'brandnewbox';

/**
 * Execute a gh CLI command and return parsed JSON
 */
function ghCommand(args) {
  try {
    const result = execSync(`gh ${args}`, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large results
    });
    return JSON.parse(result);
  } catch (error) {
    console.error(`gh command failed: gh ${args}`);
    console.error(error.message);
    return null;
  }
}

/**
 * Execute a gh CLI command and return raw output
 */
function ghCommandRaw(args) {
  try {
    return execSync(`gh ${args}`, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (error) {
    console.error(`gh command failed: gh ${args}`);
    console.error(error.message);
    return null;
  }
}

/**
 * List all repositories in the organization
 */
async function listRepos() {
  const repos = ghCommand(`repo list ${GITHUB_ORG} --json name,description,url,updatedAt --limit 100`);
  return repos || [];
}

/**
 * Search issues across the organization
 */
async function searchIssues(query, limit = 20) {
  const searchQuery = `${query} org:${GITHUB_ORG}`;
  const issues = ghCommand(`search issues "${searchQuery}" --json title,body,url,repository,state,createdAt,author --limit ${limit}`);
  return issues || [];
}

/**
 * Search pull requests across the organization
 */
async function searchPullRequests(query, limit = 20) {
  const searchQuery = `${query} org:${GITHUB_ORG}`;
  const prs = ghCommand(`search prs "${searchQuery}" --json title,body,url,repository,state,createdAt,author --limit ${limit}`);
  return prs || [];
}

/**
 * Search code across the organization
 */
async function searchCode(query, limit = 20) {
  const searchQuery = `${query} org:${GITHUB_ORG}`;
  const code = ghCommand(`search code "${searchQuery}" --json path,repository,url --limit ${limit}`);
  return code || [];
}

/**
 * Search commits across the organization
 */
async function searchCommits(query, limit = 20) {
  const searchQuery = `${query} org:${GITHUB_ORG}`;
  const commits = ghCommand(`search commits "${searchQuery}" --json sha,commit,repository,url --limit ${limit}`);
  return commits || [];
}

/**
 * Get details of a specific issue or PR
 */
async function getIssueDetails(repoFullName, issueNumber) {
  const issue = ghCommand(`issue view ${issueNumber} --repo ${repoFullName} --json title,body,comments,url,state`);
  return issue;
}

/**
 * Get file contents from a repository
 */
async function getFileContents(repoFullName, filePath) {
  const contents = ghCommandRaw(`api repos/${repoFullName}/contents/${filePath} --jq '.content' | base64 -d`);
  return contents;
}

/**
 * Perform a comprehensive search across all GitHub data types
 */
async function comprehensiveSearch(query) {
  console.log(`Searching GitHub for: "${query}" in org:${GITHUB_ORG}`);

  // Run searches in parallel
  const [issues, prs, code, commits] = await Promise.all([
    searchIssues(query, 10),
    searchPullRequests(query, 10),
    searchCode(query, 10),
    searchCommits(query, 5),
  ]);

  return {
    issues,
    pullRequests: prs,
    code,
    commits,
    summary: {
      issuesFound: issues.length,
      prsFound: prs.length,
      codeFilesFound: code.length,
      commitsFound: commits.length,
    }
  };
}

module.exports = {
  listRepos,
  searchIssues,
  searchPullRequests,
  searchCode,
  searchCommits,
  getIssueDetails,
  getFileContents,
  comprehensiveSearch,
  GITHUB_ORG,
};
