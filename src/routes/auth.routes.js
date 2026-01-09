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
const ctrl = require("../controllers/auth.controller");
const auth = require("../middleware/auth.middleware");

router.post("/register", ctrl.register);
router.post("/login", ctrl.login);
router.get("/me", auth, ctrl.me);

module.exports = router;

