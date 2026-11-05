/**
 * Migration: Replace the unique SPARSE index on promotion_decision_id with a
 * unique PARTIAL index that excludes null/missing values.
 *
 * PROBLEM:
 *   The old index `{ promotion_decision_id: 1 }` with `{ unique: true, sparse: true }`
 *   treated explicit `null` as an indexed value. The `promoteStudent` and
 *   `bulkPromoteStudents` controllers create PromotionHistory records without a
 *   PromotionDecision, so `promotion_decision_id` defaults to `null` (schema
 *   `default: null`). The first null-valued history inserted fine, but the SECOND
 *   one (for a different student) hit E11000:
 *     duplicate key error index: promotionhistories.promotion_decision_id_1
 *     dup key: { promotion_decision_id: null }
 *
 *   A sparse index only excludes documents where the field is *missing*; it still
 *   indexes documents where the field is explicitly `null`. Combined with
 *   `unique`, only one null record was allowed — blocking all but the first
 *   decision-less promotion.
 *
 * FIX:
 *   Drop the old sparse unique index and create a partial unique index that only
 *   enforces uniqueness for real (non-null) PromotionDecision IDs. This preserves
 *   the guarantee that each PromotionDecision maps to exactly one PromotionHistory
 *   (used by executePromotion), while allowing unlimited null/missing histories
 *   (used by promoteStudent / bulkPromoteStudents).
 *
 * RUN:
 *   node backend/src/scripts/migrate-promotion-history-partial-index.js
 *
 * IDEMPOTENT: safe to run multiple times.
 */
require("dotenv").config();
const mongoose = require("mongoose");

const OLD_INDEX_NAME = "promotion_decision_id_1";

const NEW_INDEX = {
  key: { promotion_decision_id: 1 },
  options: {
    unique: true,
    name: OLD_INDEX_NAME,
    partialFilterExpression: {
      promotion_decision_id: { $type: "objectId" },
    },
  },
};

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB\n");

  const collection = mongoose.connection.db.collection("promotionhistories");

  // 1. Inspect current index state
  const beforeIndexes = await collection.indexes();
  const oldIndex = beforeIndexes.find((idx) => idx.name === OLD_INDEX_NAME);

  if (oldIndex) {
    const hasPartialFilter =
      oldIndex.partialFilterExpression !== undefined;
    const isSparse = Boolean(oldIndex.sparse);

    console.log(`Current "${OLD_INDEX_NAME}" index:`);
    console.log(`  unique: ${oldIndex.unique}`);
    console.log(`  sparse: ${isSparse}`);
    console.log(`  partialFilterExpression: ${hasPartialFilter ? JSON.stringify(oldIndex.partialFilterExpression) : "(none)"}`);

    if (!hasPartialFilter) {
      // 2. Drop the old sparse unique index (it predates the partial-filter fix)
      try {
        await collection.dropIndex(OLD_INDEX_NAME);
        console.log(`\nDropped old sparse unique index: ${OLD_INDEX_NAME}`);
      } catch (err) {
        if (err.codeName === "IndexNotFound") {
          console.log(`Skip drop "${OLD_INDEX_NAME}": index does not exist`);
        } else {
          throw err;
        }
      }
    } else {
      console.log(`\n"${OLD_INDEX_NAME}" is already a partial filter index — no rebuild needed`);
    }
  } else {
    console.log(`\n"${OLD_INDEX_NAME}" does not exist — creating new partial unique index`);
  }

  // 3. Create the new partial unique index (idempotent)
  try {
    await collection.createIndex(NEW_INDEX.key, NEW_INDEX.options);
    console.log(`Created/verified partial unique index: ${NEW_INDEX.options.name}`);
  } catch (err) {
    if (err.code === 85 || err.code === 86) {
      // Index already exists with same name or options
      console.log(`Index already exists: ${NEW_INDEX.options.name}`);
    } else {
      throw err;
    }
  }

  // 4. Report final index state
  const afterIndexes = await collection.indexes();
  const finalIndex = afterIndexes.find((idx) => idx.name === OLD_INDEX_NAME);

  console.log("\nFinal promotionhistories indexes:");
  for (const idx of afterIndexes) {
    const keyFields = Object.keys(idx.key);
    if (keyFields.includes("promotion_decision_id") || idx.name === OLD_INDEX_NAME) {
      console.log(
        `  - ${idx.name}: ${JSON.stringify(idx.key)}` +
          (idx.unique ? " UNIQUE" : "") +
          (idx.sparse ? " SPARSE" : "") +
          (idx.partialFilterExpression
            ? ` PARTIAL(${JSON.stringify(idx.partialFilterExpression)})`
            : ""),
      );
    }
  }

  if (finalIndex) {
    const isPartial =
      finalIndex.partialFilterExpression !== undefined;
    const isSparse = Boolean(finalIndex.sparse);

    if (!isPartial || isSparse) {
      console.error(
        `\nWARNING: "${OLD_INDEX_NAME}" is not a partial unique index.` +
          ` unique=${finalIndex.unique}, sparse=${isSparse},` +
          ` partial=${isPartial}`,
      );
      process.exitCode = 1;
    } else {
      console.log(
        `\n✅ CONFIRMED: "${OLD_INDEX_NAME}" is unique with partialFilterExpression` +
          ` excluding null/missing promotion_decision_id values.`,
      );
    }
  }

  await mongoose.disconnect();
  console.log("\nMigration complete");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
