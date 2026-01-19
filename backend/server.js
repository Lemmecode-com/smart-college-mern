require("dotenv").config();
const app = require("./app");
const connectDB = require("./src/config/db");
const seedSuperAdmin = require("./src/utils/seedSuperAdmin");

connectDB().then(seedSuperAdmin);

const PORT = process.env.PORT;
app.listen(PORT, () =>
  console.log(`Server running on port http://localhost:${PORT}`)
);
