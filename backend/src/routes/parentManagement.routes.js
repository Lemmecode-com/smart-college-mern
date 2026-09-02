const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const collegeMiddleware = require("../middlewares/college.middleware");
const { ROLE } = require("../utils/constants");
const parentManagementController = require("../controllers/parentManagement.controller");

router.use(auth, role(ROLE.COLLEGE_ADMIN), collegeMiddleware);

router.get("/parents", parentManagementController.listParents);
router.get("/parents/:id", parentManagementController.getParent);
router.put("/parents/:id", parentManagementController.updateParent);
router.patch("/parents/:id/status", parentManagementController.updateParentStatus);
router.post("/parents/:id/reset-password", parentManagementController.resetParentPassword);

module.exports = router;
