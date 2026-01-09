import { parseRepoUrl, fetchRepository } from './server/github.js';

async function test() {
  console.log('Testing GitHub API integration...\n');
  
  // Test URL parsing
  const url = 'https://github.com/vercel/next.js';
  console.log('1. Testing URL parsing:', url);
  const parsed = parseRepoUrl(url);
  console.log('   Parsed:', parsed);
  
  if (!parsed) {
    console.error('   ❌ Failed to parse URL');
    return;
  }
  
  // Test repository fetch
  console.log('\n2. Testing repository fetch...');
  try {
    const repo = await fetchRepository(parsed.owner, parsed.repo);
    console.log('   ✅ Repository:', repo.full_name);
    console.log('   ✅ Stars:', repo.stargazers_count);
  } catch (error) {
    console.error('   ❌ Error:', error.message);
  }
}

test();
