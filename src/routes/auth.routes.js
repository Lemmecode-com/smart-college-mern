// const router = require("express").Router();
// const auth = require("../middleware/auth.middleware");
// const ctrl = require("../controllers/auth.controller");

// router.post("/register", ctrl.register);
// router.post("/login", ctrl.login);
// router.get("/me", auth, ctrl.me);

// module.exports = router






// const router = require("express").Router();
// const ctrl = require("../controllers/auth.controller");

// router.post("/register", ctrl.register);
// router.post("/login", ctrl.login);

// module.exports = router;




const router = require("express").Router();
const authCtrl = require("../controllers/auth.controller");
const auth = require("../middleware/auth.middleware");

router.post("/register", authCtrl.register);
router.post("/login", authCtrl.login);
router.get("/me", auth, authCtrl.me);
router.post("/logout", auth, authCtrl.logout); // ✅ NEW

module.exports = router;
