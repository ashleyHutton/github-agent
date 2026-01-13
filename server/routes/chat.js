const express = require('express');
const router = express.Router();
const github = require('../services/github');
const llm = require('../services/llm');

/**
 * POST /api/chat
 * Main chat endpoint - takes a question and returns an AI-generated answer
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, apiKey, systemPrompt } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required. Please enter your Anthropic API key in settings.' });
    }

    console.log(`Processing query: "${message}"`);

    // Step 1: Extract search keywords from the user's question
    console.log('Extracting search keywords...');
    const keywords = await llm.extractSearchKeywords(apiKey, message);
    console.log('Keywords:', keywords);

    // Step 2: Search GitHub using each keyword
    let allResults = {
      issues: [],
      pullRequests: [],
      code: [],
      commits: [],
    };

    for (const keyword of keywords) {
      const results = await github.comprehensiveSearch(keyword);
      allResults.issues.push(...results.issues);
      allResults.pullRequests.push(...results.pullRequests);
      allResults.code.push(...results.code);
      allResults.commits.push(...results.commits);
    }

    // Deduplicate results by URL
    allResults.issues = deduplicateByUrl(allResults.issues);
    allResults.pullRequests = deduplicateByUrl(allResults.pullRequests);
    allResults.code = deduplicateByUrl(allResults.code);
    allResults.commits = deduplicateByUrl(allResults.commits);

    allResults.summary = {
      issuesFound: allResults.issues.length,
      prsFound: allResults.pullRequests.length,
      codeFilesFound: allResults.code.length,
      commitsFound: allResults.commits.length,
    };

    console.log('Search summary:', allResults.summary);

    // Step 3: Generate response using Claude
    console.log('Generating response...');
    const response = await llm.generateResponse(apiKey, message, allResults, systemPrompt);

    res.json({
      response,
      searchSummary: allResults.summary,
      keywords,
    });
  } catch (error) {
    console.error('Chat error:', error);

    // Check for specific API key errors
    if (error.message?.includes('401') || error.message?.includes('authentication')) {
      return res.status(401).json({ error: 'Invalid API key. Please check your Anthropic API key.' });
    }

    res.status(500).json({ error: 'An error occurred processing your request. Please try again.' });
  }
});

/**
 * GET /api/system-prompt
 * Get the default system prompt
 */
router.get('/system-prompt', (req, res) => {
  res.json({ systemPrompt: llm.DEFAULT_SYSTEM_PROMPT });
});

/**
 * GET /api/repos
 * List all repositories in the organization
 */
router.get('/repos', async (req, res) => {
  try {
    const repos = await github.listRepos();
    res.json({ repos, org: github.GITHUB_ORG });
  } catch (error) {
    console.error('Error listing repos:', error);
    res.status(500).json({ error: 'Failed to list repositories' });
  }
});

/**
 * POST /api/search
 * Direct search endpoint (for debugging/testing)
 */
router.post('/search', async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const results = await github.comprehensiveSearch(query);
    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

/**
 * Helper function to deduplicate results by URL
 */
function deduplicateByUrl(items) {
  const seen = new Set();
  return items.filter(item => {
    if (seen.has(item.url)) {
      return false;
    }
    seen.add(item.url);
    return true;
  });
}

module.exports = router;
