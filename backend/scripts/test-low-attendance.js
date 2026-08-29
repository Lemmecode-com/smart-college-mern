require('dotenv').config();
const mongoose = require('mongoose');
const { sendLowAttendanceAlerts } = require('../src/services/lowAttendanceAlert.service');

async function main() {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI not found in .env');
    }
    
    await mongoose.connect(mongoUri);
    console.log('Connected to DB, sending low attendance alerts...');
    
    const result = await sendLowAttendanceAlerts();
    console.log('Done - alerts sent:', result);
    
  } catch (error) {
    console.error('Failed:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();