import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const source = resolve(scriptDirectory, "../../circuits/target/circuits.json");
const destination = resolve(scriptDirectory, "../public/circuits.json");

mkdirSync(dirname(destination), { recursive: true });
copyFileSync(source, destination);
console.log(`Copied Noir circuit to ${destination}`);
