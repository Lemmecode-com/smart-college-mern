const router = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const { login, logout } = require("../controllers/auth.controller");

router.post("/login", login);

// 🔐 Protected logout
router.post("/logout", auth, logout);

module.exports = router;

