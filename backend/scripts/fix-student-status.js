require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  await db.collection('students').updateOne(
    { email: 'teststudent@test.com' },
    { $set: { status: 'APPROVED' } }
  );
  console.log('Updated student status to APPROVED');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
