// Simple API test script to debug JSON parsing issues
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5001/api';

async function testEndpoint(endpoint, method = 'GET', body = null) {
  console.log(`\n🔍 Testing ${method} ${endpoint}`);
  
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const contentType = response.headers.get('content-type');
    
    console.log(`Status: ${response.status}`);
    console.log(`Content-Type: ${contentType}`);
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      console.log('Response:', JSON.stringify(data, null, 2));
    } else {
      const text = await response.text();
      console.log('Raw Response:', text);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting API Debug Tests...\n');
  
  // Test basic endpoints
  await testEndpoint('/health');
  await testEndpoint('/categories');
  await testEndpoint('/products/meta/categories');
  
  // Test with authentication (this will fail but show us the error format)
  await testEndpoint('/products');
  
  console.log('\n✅ Debug tests completed!');
}

runTests().catch(console.error);
