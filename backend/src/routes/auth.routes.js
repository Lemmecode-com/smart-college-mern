const router = require("express").Router();
const authCtrl = require("../controllers/auth.controller");
const auth = require("../middleware/auth.middleware");

router.post("/register", authCtrl.register);
router.post("/login", authCtrl.login);
router.get("/me", auth, authCtrl.me);
router.post("/logout", auth, authCtrl.logout); // ✅ NEW

module.exports = router;