import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config({ path: '.env.local' });

async function testBraveSearch() {
  try {
    const query = 'artificial intelligence';
    const rapidApiKey = process.env.BRAVE_RAPIDAPI_KEY;
    const rapidApiHost = process.env.BRAVE_RAPIDAPI_HOST;
    
    console.log('Using RapidAPI Key:', rapidApiKey ? 'Available' : 'Missing');
    console.log('Using RapidAPI Host:', rapidApiHost);
    
    const response = await axios.get(`https://${rapidApiHost}/search`, {
      params: {
        q: query
      },
      headers: {
        'x-rapidapi-host': rapidApiHost,
        'x-rapidapi-key': rapidApiKey
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response structure:', Object.keys(response.data));
    console.log('Number of results:', response.data.results?.length || 'No results found');
    
    if (response.data.results?.length > 0) {
      console.log('\nFirst result:');
      console.log(JSON.stringify(response.data.results[0], null, 2));
    }
    
  } catch (error) {
    console.error('Error testing Brave Search via RapidAPI:');
    console.error(error.response?.data || error.message);
  }
}

testBraveSearch();
