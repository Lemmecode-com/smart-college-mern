const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");
const { createParent } = require("../controllers/parent.controller");

router.post(
  "/",
  authMiddleware,
  roleMiddleware("student"),
  createParent
);

module.exports = router;
