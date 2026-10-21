/**
 * One-off, SAFE, idempotent script to resize existing large college logos.
 *
 * Usage:
 *   node scripts/resize-existing-logos.js               (DRY-RUN: prints sizes without modifying DB)
 *   node scripts/resize-existing-logos.js --apply       (Applies resize to GridFS and updates Document record)
 *   node scripts/resize-existing-logos.js --apply --delete-old (Also removes old GridFS files)
 */

require("dotenv").config();
const mongoose = require("mongoose");
const { GridFSBucket, ObjectId } = require("mongodb");
const { processCollegeLogo } = require("../src/utils/logoProcessor");

const isApply = process.argv.includes("--apply");
const isDeleteOld = process.argv.includes("--delete-old");
const SIZE_THRESHOLD_BYTES = 100 * 1024; // 100 KB

async function main() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("MONGO_URI environment variable is missing.");
    process.exit(1);
  }

  console.log("=================================================");
  console.log("     COLLEGE LOGO RESIZE UTILITY                ");
  console.log(`     MODE: ${isApply ? "LIVE APPLY (--apply)" : "DRY-RUN (no changes will be written)"}`);
  console.log(`     THRESHOLD: > ${Math.round(SIZE_THRESHOLD_BYTES / 1024)} KB`);
  console.log(`     DELETE OLD FILES: ${isDeleteOld ? "YES" : "NO (preserved)"}`);
  console.log("=================================================\n");

  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;
  const bucket = new GridFSBucket(db, { bucketName: "fs" });

  const colleges = await db.collection("colleges").find({
    logoDocumentId: { $ne: null, $exists: true },
  }).toArray();

  console.log(`Found ${colleges.length} college(s) with configured logos.\n`);

  let scannedCount = 0;
  let candidatesCount = 0;
  let processedCount = 0;

  for (const college of colleges) {
    scannedCount++;
    const doc = await db.collection("documents").findOne({
      documentId: college.logoDocumentId,
      status: { $ne: "DELETED" },
    });

    if (!doc) {
      console.log(`[SKIP] College "${college.name}" (${college.code}): Document ${college.logoDocumentId} not found.`);
      continue;
    }

    const currentSize = doc.size || 0;
    if (currentSize <= SIZE_THRESHOLD_BYTES) {
      console.log(`[OPTIMAL] College "${college.name}" (${college.code}): ${currentSize} bytes (<= 100 KB), skipping.`);
      continue;
    }

    candidatesCount++;
    console.log(`[CANDIDATE] College "${college.name}" (${college.code}): Current size = ${(currentSize / 1024).toFixed(1)} KB (${currentSize} B)`);

    // Download existing file from GridFS
    let oldFileId = null;
    if (ObjectId.isValid(doc.storageKey)) {
      oldFileId = new ObjectId(doc.storageKey);
    } else {
      const fileDoc = await db.collection("fs.files").findOne({ filename: doc.storageKey });
      if (fileDoc) oldFileId = fileDoc._id;
    }

    if (!oldFileId) {
      console.log(`  └─ [ERROR] Could not resolve GridFS file for storageKey: ${doc.storageKey}`);
      continue;
    }

    let originalBuffer;
    try {
      originalBuffer = await new Promise((resolve, reject) => {
        const stream = bucket.openDownloadStream(oldFileId);
        const chunks = [];
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("error", reject);
        stream.on("end", () => resolve(Buffer.concat(chunks)));
      });
    } catch (err) {
      console.log(`  └─ [ERROR] Failed to read from GridFS: ${err.message}`);
      continue;
    }

    // Process and resize using sharp
    let optimized;
    try {
      optimized = await processCollegeLogo(originalBuffer, doc.originalFileName, doc.mimeType);
    } catch (err) {
      console.log(`  └─ [ERROR] Sharp resize failed: ${err.message}`);
      continue;
    }

    const reductionPercent = (((currentSize - optimized.size) / currentSize) * 100).toFixed(1);
    console.log(
      `  └─ Optimized size = ${(optimized.size / 1024).toFixed(1)} KB (${optimized.size} B) | Reduction: ${reductionPercent}%`
    );

    if (!isApply) {
      console.log("  └─ [DRY-RUN] No changes written. Run with --apply to commit.");
      continue;
    }

    // APPLY: write new file to GridFS
    try {
      const newFileId = new ObjectId();
      const ext = ".webp";
      const newFilename = `college-logo/${Date.now()}-${newFileId.toString()}${ext}`;

      await new Promise((resolve, reject) => {
        const uploadStream = bucket.openUploadStreamWithId(newFileId, newFilename, {
          contentType: "image/webp",
          metadata: {
            category: "college-logo",
            originalName: optimized.originalName,
          },
        });
        uploadStream.on("error", reject);
        uploadStream.on("finish", resolve);
        uploadStream.write(optimized.buffer);
        uploadStream.end();
      });

      // Update Document record
      await db.collection("documents").updateOne(
        { _id: doc._id },
        {
          $set: {
            storageKey: newFileId.toString(),
            size: optimized.size,
            mimeType: "image/webp",
            originalFileName: optimized.originalName,
            updatedAt: new Date(),
          },
        }
      );

      // Update College record logo path
      await db.collection("colleges").updateOne(
        { _id: college._id },
        {
          $set: {
            logo: newFileId.toString(),
            updatedAt: new Date(),
          },
        }
      );

      console.log(`  └─ [APPLIED] Updated Document and College records with new WebP asset (${newFileId.toString()}).`);

      if (isDeleteOld) {
        try {
          await bucket.delete(oldFileId);
          console.log(`  └─ [DELETED] Removed old GridFS file: ${oldFileId.toString()}`);
        } catch (delErr) {
          console.log(`  └─ [WARN] Could not delete old file ${oldFileId.toString()}: ${delErr.message}`);
        }
      } else {
        console.log(`  └─ [PRESERVED] Old GridFS file kept: ${oldFileId.toString()}`);
      }

      processedCount++;
    } catch (writeErr) {
      console.log(`  └─ [ERROR] Failed to apply update: ${writeErr.message}`);
    }
  }

  console.log("\n=================================================");
  console.log("                   SUMMARY                       ");
  console.log(`  Total scanned   : ${scannedCount}`);
  console.log(`  Candidates (>100KB): ${candidatesCount}`);
  console.log(`  Status          : ${isApply ? `Applied ${processedCount} update(s)` : "DRY-RUN completed (0 changes written)"}`);
  console.log("=================================================");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
