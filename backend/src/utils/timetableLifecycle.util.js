const AppError = require("../utils/AppError");

const ARCHIVED_ERRORS = {
  slot: "Cannot modify slots of an archived timetable",
  exception: "Cannot modify exceptions of an archived timetable",
  timetable: "Archived timetables cannot be deleted",
};

/**
 * Assert that a timetable is in a mutable state (DRAFT or PUBLISHED).
 *
 * @param {Object} timetable - Mongoose timetable document
 * @param {string} [resourceType="timetable"] - "slot" | "exception" | "timetable"
 * @throws {AppError} 400 ARCHIVED_TIMETABLE if timetable is archived
 */
function assertTimetableMutable(timetable, resourceType = "timetable") {
  if (!timetable) {
    throw new AppError("Timetable not found", 404, "TIMETABLE_NOT_FOUND");
  }

  if (timetable.status === "ARCHIVED") {
    const message = ARCHIVED_ERRORS[resourceType] || ARCHIVED_ERRORS.timetable;
    throw new AppError(message, 400, "ARCHIVED_TIMETABLE");
  }
}

module.exports = {
  assertTimetableMutable,
};
