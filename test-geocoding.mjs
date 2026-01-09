import { parseLocationToCountry } from './server/geocoding.js';

async function test() {
  console.log('Testing Google Maps Geocoding API...\n');
  
  const testLocations = ['China', 'Los Angeles, CA', 'United States', 'Beijing'];
  
  for (const location of testLocations) {
    console.log(`Testing: "${location}"`);
    try {
      const result = await parseLocationToCountry(location);
      if (result) {
        console.log(`  ✅ ${result.name} (${result.code})`);
      } else {
        console.log(`  ❌ Could not resolve`);
      }
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
    }
    console.log('');
  }
}

test().catch(console.error);
