require("dotenv").config();
const mongoose = require("mongoose");

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;

    const names = await db.listCollections().toArray();
    console.log("COLLECTIONS:", names.map(n => n.name).join(", "));

    const collName = names.find(n => /collegeemailconfig/i.test(n.name))?.name;
    if (!collName) {
      console.log("NO CollegeEmailConfig collection found");
      return mongoose.disconnect();
    }

    const coll = db.collection(collName);
    const docs = await coll.find({}).limit(10).toArray();
    console.log(`\nDOCUMENTS (${docs.length}):`);
    console.log(JSON.stringify(docs, null, 2));

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
