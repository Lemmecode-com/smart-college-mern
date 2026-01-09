// const router = require("express").Router();
// const auth = require("../middleware/auth.middleware");
// const role = require("../middleware/role.middleware");
// const ctrl = require("../controllers/department.controller");

// router.post("/", auth, role("Admin"), ctrl.create);
// router.get("/", auth, ctrl.list);

// module.exports = router;




const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const role = require("../middleware/role.middleware");
const ctrl = require("../controllers/department.controller");

router.post("/", auth, role("admin"), ctrl.createDepartment);
router.get("/", auth, ctrl.getDepartments);
router.get("/:id", auth, ctrl.getDepartmentById);
router.put("/:id", auth, role("admin"), ctrl.updateDepartment);
router.delete("/:id", auth, role("admin"), ctrl.deleteDepartment);

module.exports = router;
