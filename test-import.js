console.log('Testing imports...');

try {
  console.log('1. Importing express...');
  const express = await import('express');
  console.log('✓ express imported');
  
  console.log('2. Importing db...');
  const db = await import('./server/db.js');
  console.log('✓ db imported');
  
  console.log('3. Importing auth routes...');
  const authRoutes = await import('./server/routes/auth.js');
  console.log('✓ auth routes imported');
  
  console.log('4. Importing sales routes...');
  const salesRoutes = await import('./server/routes/sales.js');
  console.log('✓ sales routes imported');
  
  console.log('\n✅ All imports successful!');
} catch (error) {
  console.error('\n❌ Import failed:');
  console.error('Error:', error.message);
  console.error('Code:', error.code);
  console.error('\nFull error:');
  console.error(error);
}
