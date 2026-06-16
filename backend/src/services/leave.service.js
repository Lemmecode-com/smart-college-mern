const mongoose = require("mongoose");
const Leave = require("../models/leave.model");
const AppError = require("../utils/AppError");

const QUOTA_TABLE = {
  SICK: 12,
  CASUAL: 10,
  EMERGENCY: 5,
  OFFICIAL: 15,
};

function getCurrentAcademicYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month >= 6) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
}

function getAcademicYearBounds(academicYear) {
  const [startStr] = academicYear.split("-");
  const startYear = parseInt(startStr, 10);
  return {
    start: new Date(startYear, 5, 1),
    end: new Date(startYear + 1, 5, 30),
  };
}

function calcDaysCount(startDate, endDate, durationType) {
  if (
    durationType === "HALF_DAY_MORNING" ||
    durationType === "HALF_DAY_AFTERNOON"
  ) {
    return 0.5;
  }
  const diffMs = endDate - startDate;
  const wholeDays = Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
  return wholeDays;
}

function normalizeDuration(daysCount, durationType) {
  let normalizedDays = daysCount;
  let normalizedType = durationType;

  if (durationType === "FULL_DAY") {
    normalizedDays = daysCount >= 1 ? daysCount : 1;
    normalizedType = "FULL_DAY";
  } else if (
    durationType === "HALF_DAY_MORNING" ||
    durationType === "HALF_DAY_AFTERNOON"
  ) {
    normalizedDays = 0.5;
    normalizedType = durationType;
  }

  return { normalizedDays, normalizedType };
}

exports.normalizeLeaveInput = (collegeId, teacherId, departmentId, body) => {
  const { startDate, endDate, daysCount, durationType, leaveType, reason } = body;

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    throw new AppError(
      "startDate must be on or before endDate",
      400,
      "INVALID_DATE_RANGE",
    );
  }

  if (
    durationType === "HALF_DAY_MORNING" ||
    durationType === "HALF_DAY_AFTERNOON"
  ) {
    if (start.getTime() !== end.getTime()) {
      throw new AppError(
        "Half-day leave requires startDate and endDate to be the same day",
        400,
        "HALF_DAY_SAME_DATE_REQUIRED",
      );
    }
  }

  const calculatedDays = calcDaysCount(start, end, durationType || "FULL_DAY");
  const { normalizedDays, normalizedType } = normalizeDuration(
    daysCount || calculatedDays,
    durationType || "FULL_DAY",
  );

  return {
    college_id: collegeId,
    teacher_id: teacherId,
    department_id: departmentId,
    leaveType,
    reason: (reason || "").trim(),
    startDate: start,
    endDate: end,
    durationType: normalizedType,
    daysCount: normalizedDays,
  };
};

exports.checkOverlap = async (collegeId, teacherId, startDate, endDate, excludeId = null) => {
  const query = {
    college_id: collegeId,
    teacher_id: teacherId,
    status: { $in: ["PENDING", "APPROVED"] },
    isActive: true,
  };

  if (excludeId) {
    try {
      query._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
    } catch {
      return null;
    }
  }

  const overlapping = await Leave.findOne({
    ...query,
    $or: [
      {
        startDate: { $lte: endDate },
        endDate: { $gte: startDate },
      },
    ],
  });

  return overlapping || null;
};

exports.resolveAcademicYear = (fallbackYear) => {
  return fallbackYear || getCurrentAcademicYear();
};

exports.getQuotaSummary = async (collegeId, teacherId, academicYear) => {
  const year = academicYear || getCurrentAcademicYear();
  const bounds = getAcademicYearBounds(year);
  const leaveTypes = ["SICK", "CASUAL", "EMERGENCY", "OFFICIAL"];
  const summary = { academicYear: year, types: [] };

  for (const lt of leaveTypes) {
    const approvedTaken = await Leave.aggregate([
      {
        $match: {
          college_id: collegeId,
          teacher_id: teacherId,
          leaveType: lt,
          status: "APPROVED",
          isActive: true,
          startDate: { $gte: bounds.start, $lte: bounds.end },
        },
      },
      {
        $group: {
          _id: null,
          approvedTaken: { $sum: "$daysCount" },
        },
      },
    ]);

    const pendingProjected = await Leave.aggregate([
      {
        $match: {
          college_id: collegeId,
          teacher_id: teacherId,
          leaveType: lt,
          status: "PENDING",
          isActive: true,
          startDate: { $gte: bounds.start, $lte: bounds.end },
        },
      },
      {
        $group: {
          _id: null,
          pendingProjected: { $sum: "$daysCount" },
        },
      },
    ]);

    const taken = approvedTaken[0]?.approvedTaken || 0;
    const pending = pendingProjected[0]?.pendingProjected || 0;
    const annualQuota = QUOTA_TABLE[lt] || 0;
    const netRemaining = Math.max(0, annualQuota - taken);

    summary.types.push({
      leaveType: lt,
      annualQuota,
      approvedTaken: taken,
      pendingProjected: pending,
      netRemaining,
      netRemainingAfterPending: Math.max(0, netRemaining - pending),
    });
  }

  summary.note =
    "Quota figures are estimates computed from approved and pending leaves. Official balances require LeaveBalance model.";

  return summary;
};
