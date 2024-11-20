import { readdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const ignore: string[] = [
    "node_modules",
    ".git",
    ".next",
    ".env",
]

function getAllFiles(dirPath: string = process.cwd(), arrayOfFiles: string[] = []): string[] {
    const files = readdirSync(dirPath, { withFileTypes: true });
    files.forEach((file) => {
        if (!ignore.some((pattern) => new RegExp(pattern).test(file.name))) {
            const filePath = join(dirPath, file.name);
            if (file.isDirectory()) {
                arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
            } else {
                arrayOfFiles.push(filePath);
            }
        }
    });

    return arrayOfFiles;
}

export default function GenerateCandidateHash(): string {
    const allFiles = getAllFiles();
    const hash = allFiles.reduce((acc, filePath) => {
        if (process.env.NODE_ENV === "development") {
            console.log(`Reading ${filePath}`);
        }
        const fileContent = readFileSync(filePath, "utf-8");
        const fileHash = createHash("sha256").update(fileContent).digest("hex");
        return acc + fileHash;
    }, "").substring(0, 12);

    if (process.env.NODE_ENV === "development") { console.log(`Generated build hash: ${hash}`); }

    return hash;
}