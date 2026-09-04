require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const hash = '$2b$10$RwNA7vW3vbFw6h9MgtVeiOL.l9KB/GVffvd95zXWKxSFTb1Bmog/W';
  const result = await db.collection('users').updateMany(
    { email: { $in: ['teststudent@test.com', 'testteacher@test.com', 'testhod@test.com'] } },
    { $set: { password: hash } }
  );
  console.log('Updated passwords:', result.modifiedCount);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
