// Test server connectivity and database
import fetch from 'node-fetch';

async function testServer() {
  console.log('🔍 Testing server connectivity...\n');
  
  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch('http://localhost:5001/api/health');
    console.log(`   Status: ${healthResponse.status}`);
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('   ✅ Health check passed:', healthData);
    } else {
      console.log('   ❌ Health check failed');
      return;
    }
    
    // Test login endpoint with invalid credentials (should return 401, not 500)
    console.log('\n2. Testing login endpoint...');
    const loginResponse = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'test',
        password: 'test'
      })
    });
    
    console.log(`   Status: ${loginResponse.status}`);
    
    if (loginResponse.status === 401) {
      console.log('   ✅ Login endpoint working (401 = invalid credentials expected)');
    } else if (loginResponse.status === 500) {
      console.log('   ❌ Login endpoint has server error (500)');
      const errorText = await loginResponse.text();
      console.log('   Error:', errorText);
    } else {
      const responseData = await loginResponse.json();
      console.log('   Response:', responseData);
    }
    
    // Test with admin credentials
    console.log('\n3. Testing with admin credentials...');
    const adminLoginResponse = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    
    console.log(`   Status: ${adminLoginResponse.status}`);
    
    if (adminLoginResponse.ok) {
      const adminData = await adminLoginResponse.json();
      console.log('   ✅ Admin login successful');
      console.log('   User:', adminData.user);
    } else {
      const errorData = await adminLoginResponse.json();
      console.log('   ❌ Admin login failed:', errorData);
    }
    
  } catch (error) {
    console.error('❌ Server test failed:', error.message);
    console.log('\n💡 Make sure the server is running with: npm run server');
  }
}

testServer();
