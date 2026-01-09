import { parseRepoUrl, fetchRepository, fetchStargazers, fetchUserDetail, GitHubUser } from './github';
import { parseLocationToCountry, CountryInfo } from './geocoding';
import {
  getRepositoryByFullName,
  createRepository,
  updateRepository,
  createCountryStats,
  deleteCountryStatsByRepositoryId,
} from './db';

export interface AnalysisProgress {
  stage: 'fetching' | 'analyzing' | 'complete';
  processed: number;
  total: number;
  message: string;
}

export interface AnalysisResult {
  repositoryId: number;
  fullName: string;
  url: string;
  starCount: number;
  analyzedCount: number;
  unknownCount: number;
  countryDistribution: Array<{
    countryCode: string;
    countryName: string;
    count: number;
  }>;
}

/**
 * Analyze a GitHub repository's stargazers geographic distribution
 */
export async function analyzeRepository(
  repoUrl: string,
  onProgress?: (progress: AnalysisProgress) => void,
  maxStargazers: number = 1000 // Limit for MVP
): Promise<AnalysisResult> {
  // Parse repository URL
  const parsed = parseRepoUrl(repoUrl);
  if (!parsed) {
    throw new Error('Invalid GitHub repository URL');
  }

  const { owner, repo } = parsed;
  const fullName = `${owner}/${repo}`;

  // Check if repository was recently analyzed (cache)
  const existing = await getRepositoryByFullName(fullName);
  if (existing) {
    const cacheAge = Date.now() - existing.updatedAt.getTime();
    const cacheMaxAge = 24 * 60 * 60 * 1000; // 24 hours

    if (cacheAge < cacheMaxAge) {
      // Return cached result
      onProgress?.({
        stage: 'complete',
        processed: existing.analyzedCount,
        total: existing.analyzedCount,
        message: 'Using cached analysis result',
      });

      const db = await import('./db');
      const stats = await db.getCountryStatsByRepositoryId(existing.id);

      return {
        repositoryId: existing.id,
        fullName: existing.fullName,
        url: existing.url,
        starCount: existing.starCount,
        analyzedCount: existing.analyzedCount,
        unknownCount: existing.unknownCount,
        countryDistribution: stats.map((s: { countryCode: string; countryName: string; count: number }) => ({
          countryCode: s.countryCode,
          countryName: s.countryName,
          count: s.count,
        })),
      };
    }
  }

  // Fetch repository info
  onProgress?.({
    stage: 'fetching',
    processed: 0,
    total: 0,
    message: 'Fetching repository information...',
  });

  const repoInfo = await fetchRepository(owner, repo);
  const actualStarCount = repoInfo.stargazers_count;
  const targetCount = Math.min(maxStargazers, actualStarCount);

  // Fetch stargazers
  onProgress?.({
    stage: 'fetching',
    processed: 0,
    total: targetCount,
    message: 'Fetching stargazers...',
  });

  const stargazers: GitHubUser[] = [];
  const stargazerLogins: string[] = [];
  
  // First, get the list of stargazer usernames
  for await (const batch of fetchStargazers(owner, repo, targetCount)) {
    stargazerLogins.push(...batch.map(u => u.login));
    onProgress?.({
      stage: 'fetching',
      processed: stargazerLogins.length,
      total: targetCount,
      message: `Fetched ${stargazerLogins.length} of ${targetCount} stargazers...`,
    });
  }
  
  // Then fetch detailed user info (including location) for each stargazer
  onProgress?.({
    stage: 'fetching',
    processed: 0,
    total: stargazerLogins.length,
    message: 'Fetching user details...',
  });
  
  for (let i = 0; i < stargazerLogins.length; i++) {
    const username = stargazerLogins[i]!;
    try {
      const userDetail = await fetchUserDetail(username);
      stargazers.push({
        login: userDetail.login,
        location: userDetail.location,
      });
      
      if ((i + 1) % 10 === 0 || i === stargazerLogins.length - 1) {
        onProgress?.({
          stage: 'fetching',
          processed: i + 1,
          total: stargazerLogins.length,
          message: `Fetched details for ${i + 1} of ${stargazerLogins.length} users...`,
        });
      }
      
      // Rate limiting: wait between requests to avoid hitting GitHub API limits
      if (i < stargazerLogins.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`Failed to fetch details for ${username}:`, error);
      // Add user without location if fetch fails
      stargazers.push({
        login: username,
        location: null,
      });
    }
  }

  // Analyze locations
  onProgress?.({
    stage: 'analyzing',
    processed: 0,
    total: stargazers.length,
    message: 'Analyzing locations...',
  });

  const countryMap = new Map<string, { code: string; name: string; count: number }>();
  let unknownCount = 0;
  let processed = 0;

  for (const user of stargazers) {
    if (!user.location || user.location.trim() === '') {
      unknownCount++;
    } else {
      const country = await parseLocationToCountry(user.location);
      if (country) {
        const existing = countryMap.get(country.code);
        if (existing) {
          existing.count++;
        } else {
          countryMap.set(country.code, {
            code: country.code,
            name: country.name,
            count: 1,
          });
        }
      } else {
        unknownCount++;
      }
    }

    processed++;
    if (processed % 10 === 0 || processed === stargazers.length) {
      onProgress?.({
        stage: 'analyzing',
        processed,
        total: stargazers.length,
        message: `Analyzed ${processed} of ${stargazers.length} locations...`,
      });
    }

    // Small delay to avoid overwhelming the geocoding API
    if (user.location && user.location.trim() !== '' && processed < stargazers.length) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  // Save to database
  const repositoryData = {
    fullName,
    url: repoUrl,
    starCount: actualStarCount,
    analyzedCount: stargazers.length,
    unknownCount,
  };

  let repositoryId: number;
  if (existing) {
    await updateRepository(existing.id, repositoryData);
    await deleteCountryStatsByRepositoryId(existing.id);
    repositoryId = existing.id;
  } else {
    const result = await createRepository(repositoryData);
    // Drizzle ORM returns an array with insertId in the first element for MySQL
    const insertId = (result as any)[0]?.insertId;
    if (!insertId) {
      throw new Error('Failed to get repository ID after insert');
    }
    repositoryId = Number(insertId);
  }

  const countryStats = Array.from(countryMap.values()).map(country => ({
    repositoryId,
    countryCode: country.code,
    countryName: country.name,
    count: country.count,
  }));

  if (countryStats.length > 0) {
    await createCountryStats(countryStats);
  }

  onProgress?.({
    stage: 'complete',
    processed: stargazers.length,
    total: stargazers.length,
    message: 'Analysis complete!',
  });

  return {
    repositoryId,
    fullName,
    url: repoUrl,
    starCount: actualStarCount,
    analyzedCount: stargazers.length,
    unknownCount,
    countryDistribution: countryStats.map(s => ({
      countryCode: s.countryCode,
      countryName: s.countryName,
      count: s.count,
    })),
  };
}
