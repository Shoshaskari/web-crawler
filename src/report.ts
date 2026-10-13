import { writeFileSync } from "node:fs";
import path from "node:path";
import type { ExtractedPageData } from "./crawl.js";

export function writeJSONReport(
  pageData: Record<string, ExtractedPageData>,
  filename = "report.json",
): void {
  const sorted = Object.values(pageData).sort((a, b) =>
    a.url.localeCompare(b.url),
  );

  const json = JSON.stringify(sorted, null, 2);
  const filepath = path.resolve(process.cwd(), filename);

  writeFileSync(filepath, json, "utf-8");
}
