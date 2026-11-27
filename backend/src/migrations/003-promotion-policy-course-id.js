require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const mongoose = require("mongoose");

const run = async () => {
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    console.error("❌ MONGO_URI not found in .env");
    process.exit(1);
  }

  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected\n");

    const policies = mongoose.connection.db.collection("promotionpolicies");

    // -------------------------------------------------------------------------
    // Index reconciliation
    //
    // Before the course_id change the model declared a UNIQUE index on
    // { collegeId, isActive } (partial: isActive === true). Mongoose never
    // drops indexes when a declaration is removed from a schema, so that index
    // survives in the database and physically allows only ONE active policy per
    // college - which blocks a college-level policy from coexisting with any
    // course-specific policy.
    //
    // It must be dropped so the replacement index
    // { collegeId, course_id, isActive } can take effect.
    // -------------------------------------------------------------------------

    const reconcileIndexes = async () => {
      const requiredIndex = "collegeId_1_course_id_1_isActive_1";
      const obsoleteIndexes = ["collegeId_1_isActive_1"];

      for (const indexName of obsoleteIndexes) {
        try {
          await policies.dropIndex(indexName);
          console.log(`🗑️  Dropped obsolete index: ${indexName}`);
        } catch (err) {
          if (err.codeName === "IndexNotFound" || err.code === 27) {
            console.log(`ℹ️  Obsolete index already absent: ${indexName}`);
          } else {
            throw err;
          }
        }
      }

      const existingIndexNames = (await policies.indexes()).map((i) => i.name);
      if (!existingIndexNames.includes(requiredIndex)) {
        await policies.createIndex(
          { collegeId: 1, course_id: 1, isActive: 1 },
          {
            unique: true,
            partialFilterExpression: { isActive: true },
            name: requiredIndex,
          },
        );
        console.log(`➕ Created index: ${requiredIndex}`);
      } else {
        console.log(`ℹ️  Index already present: ${requiredIndex}`);
      }
    };

    const withoutCourseId = await policies
      .find({ course_id: { $exists: false } })
      .toArray();

    console.log(`📊 Found ${withoutCourseId.length} PromotionPolicy records without course_id\n`);

    if (withoutCourseId.length === 0) {
      console.log("✅ Nothing to fix. All records have course_id.");
    } else {
      let fixed = 0;

      for (const policy of withoutCourseId) {
        await policies.updateOne(
          { _id: policy._id },
          { $set: { course_id: null } }
        );
        console.log(`✅ Fixed: Policy ${policy._id} → course_id: null`);
        fixed++;
      }

      console.log(`\n📈 Summary: ${fixed} fixed`);
    }

    console.log("\n🔧 Reconciling indexes...");
    await reconcileIndexes();

    await mongoose.disconnect();
    console.log("🔌 Disconnected\nDone!");
  } catch (err) {
    console.error("❌ Migration error:", err);
    process.exit(1);
  }
};

run();