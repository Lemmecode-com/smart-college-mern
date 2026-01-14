// routes/parent.routes.js
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const roleMiddleware = require("../middleware/role.middleware");
const { getMyChildren } = require("../controllers/parent.controller");

router.get(
  "/students",
  authMiddleware,
  roleMiddleware("parent"),
  getMyChildren
);

module.exports = router;
