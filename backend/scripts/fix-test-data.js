require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  await db.collection('teachers').updateMany(
    { email: { $in: ['testteacher@test.com', 'testhod@test.com'] } },
    { $set: { status: 'ACTIVE' } }
  );
  console.log('Updated teacher statuses');

  await db.collection('departments').updateOne(
    { _id: '6a9abab75b4bb74cb760ca16' },
    { $set: { hod_id: '6a9abac35b4bb74cb760ca1f' } }
  );
  console.log('Updated department HOD');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
