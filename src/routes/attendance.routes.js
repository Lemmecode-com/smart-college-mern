const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const ctrl = require("../controllers/attendance.controller");

router.post("/", auth, role("Teacher"), ctrl.mark);
router.get("/", auth, ctrl.list);

module.exports = router;