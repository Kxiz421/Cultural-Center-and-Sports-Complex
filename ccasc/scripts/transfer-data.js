const { PrismaClient } = require("@prisma/client");
const { execSync } = require("child_process");
const path = require("path");

// First, dump data from local MySQL
console.log("Dumping data from local MySQL...");
execSync(
  `"C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqldump" -u root --no-create-info --complete-insert --skip-comments ccasc > local_data.sql`,
  { cwd: __dirname, stdio: "inherit" }
);

console.log("Data dumped. Now importing to Railway...");
execSync(
  `"C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql" --binary-mode -h zephyr.proxy.rlwy.net -P 53416 -u root -ppNiXyZkdBjYKTvHtmYYNLioyuyEGsyDS ccasc < local_data.sql`,
  { cwd: __dirname, stdio: "inherit" }
);

console.log("Data transfer complete!");