import { defineConfig } from "@playwright/test";
import chromium from "@sparticuz/chromium";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { brotliDecompressSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

// The npm-distributed test browser avoids a separate CDN download on Linux CI.
const libraryDir = join(tmpdir(), "proudgeon-browser-libs");
if (!process.env.CHROME_PATH && process.platform === "linux") {
  mkdirSync(libraryDir, { recursive: true });
  const archive = join(libraryDir, "libs.tar");
  writeFileSync(
    archive,
    brotliDecompressSync(
      readFileSync(
        new URL(
          "./node_modules/@sparticuz/chromium/bin/al2023.tar.br",
          import.meta.url,
        ),
      ),
    ),
  );
  execFileSync("tar", ["xf", archive, "-C", libraryDir]);
}

export default defineConfig({
  testDir: "./tests",
  timeout: 45000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3000",
    launchOptions: {
      env: {
        ...process.env,
        LD_LIBRARY_PATH: `${libraryDir}/lib:${process.env.LD_LIBRARY_PATH || ""}`,
      },
      executablePath:
        process.env.CHROME_PATH || (await chromium.executablePath()),
      args: chromium.args.filter((arg) => arg !== "--single-process"),
    },
  },
  webServer: {
    command: "npm start",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
  },
});
