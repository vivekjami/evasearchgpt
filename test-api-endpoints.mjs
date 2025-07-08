import axios from 'axios';

async function testSearchAPI() {
  try {
    console.log('Testing Search API...');
    const response = await axios.post('http://localhost:3000/api/search', {
      query: 'artificial intelligence trends',
    });
    
    console.log('Search API Response Status:', response.status);
    console.log('Search API Response Structure:', Object.keys(response.data));
    console.log('Answer Length:', response.data.answer?.length || 'No answer');
    console.log('Sources Count:', response.data.sources?.length || 'No sources');
    console.log('Follow-up Questions:', response.data.followUpQuestions?.length || 'None');
    
    return true;
  } catch (error) {
    console.error('Search API Test Failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error Response:', error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error setting up request:', error);
    }
    return false;
  }
}

async function testChatAPI() {
  try {
    console.log('\nTesting Chat API...');
    const response = await axios.post('http://localhost:3000/api/chat', {
      message: 'What are the latest developments in quantum computing?',
      history: [
        {
          role: 'user',
          content: 'Tell me about artificial intelligence',
          timestamp: new Date().toISOString()
        },
        {
          role: 'assistant',
          content: 'Artificial Intelligence (AI) refers to the simulation of human intelligence in machines...',
          timestamp: new Date().toISOString()
        }
      ]
    });
    
    console.log('Chat API Response Status:', response.status);
    console.log('Chat API Response Structure:', Object.keys(response.data));
    console.log('Answer Length:', response.data.answer?.length || 'No answer');
    console.log('Sources Count:', response.data.sources?.length || 'No sources');
    console.log('Follow-up Questions:', response.data.followUpQuestions?.length || 'None');
    
    return true;
  } catch (error) {
    console.error('Chat API Test Failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error Response:', error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error setting up request:', error);
    }
    return false;
  }
}

async function runTests() {
  console.log('=== API ENDPOINT TESTS ===');
  const searchResult = await testSearchAPI();
  const chatResult = await testChatAPI();
  
  console.log('\n=== TEST SUMMARY ===');
  console.log('Search API:', searchResult ? '✅ Passed' : '❌ Failed');
  console.log('Chat API:', chatResult ? '✅ Passed' : '❌ Failed');
}

runTests();
