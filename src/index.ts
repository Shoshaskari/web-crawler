import { crawlSiteAsync } from "./crawl.js";
import { writeJSONReport } from "./report.js";

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length !== 3) {
    console.error(
      "Usage: npm run start <URL> <maxConcurrency> <maxPages>",
    );
    process.exit(1);
  }

  const baseURL = args[0];
  const maxConcurrency = Number(args[1]);
  const maxPages = Number(args[2]);

  if (
    !baseURL ||
    !Number.isInteger(maxConcurrency) ||
    maxConcurrency < 1 ||
    !Number.isInteger(maxPages) ||
    maxPages < 1
  ) {
    console.error(
      "Error: URL, maxConcurrency, and maxPages must be valid.",
    );
    process.exit(1);
  }

  const pages = await crawlSiteAsync(
    baseURL,
    maxConcurrency,
    maxPages,
  );

  console.log("Finished crawling.");

  const firstPage = Object.values(pages)[0];

  if (firstPage) {
    console.log(
      `First page record: ${firstPage["url"]} - ${firstPage["heading"]}`,
    );
  }

  writeJSONReport(pages, "report.json");
  console.log("JSON report written to report.json");
}

main().catch((error) => {
  console.error("Crawler failed:", error);
  process.exit(1);
});
