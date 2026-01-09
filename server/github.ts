import axios from 'axios';

export interface GitHubUser {
  login: string;
  location: string | null;
}

export interface GitHubUserDetail {
  login: string;
  location: string | null;
  name: string | null;
  company: string | null;
}

export interface GitHubRepo {
  full_name: string;
  stargazers_count: number;
}

const GITHUB_API_BASE = 'https://api.github.com';
const RATE_LIMIT_DELAY = 1000; // 1 second between requests

/**
 * Parse GitHub repository URL to extract owner and repo name
 */
export function parseRepoUrl(url: string): { owner: string; repo: string } | null {
  const patterns = [
    /github\.com\/([^\/]+)\/([^\/]+)/,
    /^([^\/]+)\/([^\/]+)$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return { owner: match[1]!, repo: match[2]!.replace(/\.git$/, '') };
    }
  }

  return null;
}

/**
 * Fetch repository information from GitHub API
 */
export async function fetchRepository(owner: string, repo: string, token?: string): Promise<GitHubRepo> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'GitHub-Stargazers-Map',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await axios.get<GitHubRepo>(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, {
    headers,
  });

  return response.data;
}

/**
 * Fetch user details including location
 */
export async function fetchUserDetail(username: string, token?: string): Promise<GitHubUserDetail> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'GitHub-Stargazers-Map',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await axios.get<GitHubUserDetail>(
    `${GITHUB_API_BASE}/users/${username}`,
    {
      headers,
    }
  );
  return response.data;
}

/**
 * Fetch stargazers for a repository with pagination
 * Returns an async generator to handle large numbers of stargazers
 */
export async function* fetchStargazers(
  owner: string,
  repo: string,
  maxCount?: number,
  token?: string
): AsyncGenerator<GitHubUser[], void, unknown> {
  let page = 1;
  let totalFetched = 0;
  const perPage = 100; // GitHub API max per page

  while (true) {
    const limit = maxCount ? Math.min(perPage, maxCount - totalFetched) : perPage;
    
    if (limit <= 0) break;

    try {
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitHub-Stargazers-Map',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await axios.get<GitHubUser[]>(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/stargazers`,
        {
          headers,
          params: {
            page,
            per_page: limit,
          },
        }
      );

      const users = response.data;
      
      if (users.length === 0) break;

      yield users;
      totalFetched += users.length;

      if (users.length < limit || (maxCount && totalFetched >= maxCount)) break;

      page++;
      
      // Rate limiting: wait between requests
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        // Rate limit exceeded
        throw new Error('GitHub API rate limit exceeded. Please try again later.');
      }
      throw error;
    }
  }
}

/**
 * Check GitHub API rate limit status
 */
export async function checkRateLimit(token?: string): Promise<{
  limit: number;
  remaining: number;
  reset: Date;
}> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'GitHub-Stargazers-Map',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await axios.get(`${GITHUB_API_BASE}/rate_limit`, {
    headers,
  });

  const { limit, remaining, reset } = response.data.rate;
  
  return {
    limit,
    remaining,
    reset: new Date(reset * 1000),
  };
}
