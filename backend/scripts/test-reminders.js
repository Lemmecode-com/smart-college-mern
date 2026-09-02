require('dotenv').config();
const mongoose = require('mongoose');
const { sendPaymentDueReminders } = require('../src/services/paymentReminder.service');

async function main() {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI not found in .env');
    }
    
    await mongoose.connect(mongoUri);
    console.log('Connected to DB, sending reminders...');
    
    const result = await sendPaymentDueReminders();
    console.log('Done:', result);
    console.log('Check emails for payment reminders');
    
  } catch (error) {
    console.error('Failed:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();