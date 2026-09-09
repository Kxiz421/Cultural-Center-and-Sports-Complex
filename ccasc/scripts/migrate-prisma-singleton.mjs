import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.join(__dirname, "../app/api");
const skip = new Set(["dashboard/admin/route.js"]);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name === "route.js") files.push(full);
  }
  return files;
}

function migrateFile(file) {
  const rel = path.relative(apiRoot, file).replace(/\\/g, "/");
  if (skip.has(rel)) return false;

  let src = fs.readFileSync(file, "utf8");
  if (!src.includes("new PrismaClient()")) return false;

  src = src.replace(
    /import \{ PrismaClient \} from "@prisma\/client";\r?\n\r?\nconst prisma = new PrismaClient\(\);\r?\n/g,
    'import prisma from "@/lib/prisma";\n\n'
  );
  src = src.replace(/import \{ PrismaClient \} from "@prisma\/client";\r?\n/g, "");
  src = src.replace(/const prisma = new PrismaClient\(\);\r?\n/g, "");

  if (!src.includes('import prisma from "@/lib/prisma"')) {
    const lines = src.split(/\r?\n/);
    let insertAt = 0;
    while (
      insertAt < lines.length &&
      (lines[insertAt].startsWith("import ") || lines[insertAt].trim() === "")
    ) {
      insertAt++;
    }
    lines.splice(insertAt, 0, 'import prisma from "@/lib/prisma";', "");
    src = lines.join("\n");
  }

  fs.writeFileSync(file, src);
  console.log("updated", rel);
  return true;
}

let count = 0;
for (const file of walk(apiRoot)) {
  if (migrateFile(file)) count++;
}
console.log("total", count);
