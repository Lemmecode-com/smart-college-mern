const ApiResponse = require("../utils/ApiResponse");
const AppError = require("../utils/AppError");
const {
  createAttempt,
  evaluateAttempt,
  getAttempts,
} = require("../services/backlogAttempt.service");

const input = (req) => ({
  backlogId: req.params.backlogId,
  collegeId: req.college_id,
  actorId: req.user.id,
  actorRole: req.user.role,
  request: req,
});

exports.createAttempt = async (req, res, next) => {
  try {
    const { attempt, exam, isIdempotent } = await createAttempt(input(req));

    const statusCode = isIdempotent ? 200 : 201;
    const message = isIdempotent
      ? "Backlog attempt already exists"
      : "Backlog attempt created successfully";

    ApiResponse.success(
      res,
      {
        attempt,
        exam,
        idempotent: isIdempotent,
      },
      message,
      statusCode,
    );
  } catch (error) {
    next(error);
  }
};

exports.evaluateAttempt = async (req, res, next) => {
  try {
    const { attempt, backlog, isIdempotent, resultStatus, passed, backlogCleared } =
      await evaluateAttempt({
        ...input(req),
        attemptId: req.params.attemptId,
      });

    const responseResultStatus = isIdempotent
      ? attempt.result_status
      : resultStatus;
    const responsePassed = isIdempotent ? attempt.passed : passed;
    const message = isIdempotent
      ? "Backlog attempt already evaluated"
      : responseResultStatus === "PASS"
        ? "Backlog cleared successfully"
        : responseResultStatus === "FAIL"
          ? "Backlog attempt failed, backlog remains open"
          : "Backlog attempt incomplete";

    ApiResponse.success(
      res,
      {
        attempt,
        backlog,
        idempotent: isIdempotent,
        resultStatus: responseResultStatus,
        passed: responsePassed,
        backlogCleared,
      },
      message,
      200,
    );
  } catch (error) {
    next(error);
  }
};

exports.getBacklogAttempts = async (req, res, next) => {
  try {
    const { backlog, attempts } = await getAttempts(
      req.params.backlogId,
      req.college_id,
    );

    ApiResponse.success(
      res,
      { backlog, attempts },
      "Backlog attempts retrieved successfully",
    );
  } catch (error) {
    next(error);
  }
};
