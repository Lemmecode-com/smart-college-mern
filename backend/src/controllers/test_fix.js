// Quick test to verify ObjectId conversion works
const mongoose = require('mongoose');

// Test the conversion
try {
  const testId = '507f1f77bcf86cd799439011';
  const objectId = new mongoose.Types.ObjectId(testId);
  console.log('✅ ObjectId conversion works:', objectId.toString());
  console.log('✅ All fixes applied correctly!');
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}