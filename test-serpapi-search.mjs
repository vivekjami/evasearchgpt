import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config({ path: '.env.local' });

async function testSerpAPI() {
  try {
    const query = 'artificial intelligence';
    const serpApiKey = process.env.SERPAPI_KEY;
    
    console.log('Using SerpAPI Key:', serpApiKey ? 'Available' : 'Missing');
    
    const response = await axios.get('https://serpapi.com/search', {
      params: {
        q: query,
        engine: 'google',
        api_key: serpApiKey,
        num: 10,
        hl: 'en',
        gl: 'us',
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response structure:', Object.keys(response.data));
    console.log('Number of results:', response.data.organic_results?.length || 'No results found');
    
    if (response.data.organic_results?.length > 0) {
      console.log('\nFirst result:');
      console.log(JSON.stringify(response.data.organic_results[0], null, 2));
    }
    
  } catch (error) {
    console.error('Error testing SerpAPI:');
    console.error(error.response?.data || error.message);
  }
}

testSerpAPI();
