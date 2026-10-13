import { JSDOM } from "jsdom";
import pLimit from "p-limit";

export function normalizeURL(url: string): string {
  const parsedURL = new URL(url);
  let pathname = parsedURL.pathname;

  if (pathname.endsWith("/")) {
    pathname = pathname.slice(0, -1);
  }

  return `${parsedURL.hostname}${pathname}`;
}

export function getHeadingFromHTML(html: string): string {
  const document = new JSDOM(html).window.document;
  const heading =
    document.querySelector("h1") ?? document.querySelector("h2");

  return heading?.textContent?.trim() ?? "";
}

export function getFirstParagraphFromHTML(html: string): string {
  const document = new JSDOM(html).window.document;
  const paragraph =
    document.querySelector("main p") ?? document.querySelector("p");

  return paragraph?.textContent?.trim() ?? "";
}

export function getURLsFromHTML(
  html: string,
  baseURL: string,
): string[] {
  const document = new JSDOM(html).window.document;
  const urls: string[] = [];

  for (const link of document.querySelectorAll("a")) {
    const href = link.getAttribute("href");
    if (!href) continue;

    try {
      urls.push(new URL(href, baseURL).href);
    } catch {
      continue;
    }
  }

  return urls;
}

export function getImagesFromHTML(
  html: string,
  baseURL: string,
): string[] {
  const document = new JSDOM(html).window.document;
  const imageURLs: string[] = [];

  for (const img of document.querySelectorAll("img")) {
    const src = img.getAttribute("src");
    if (!src) continue;

    try {
      imageURLs.push(new URL(src, baseURL).href);
    } catch {
      continue;
    }
  }

  return imageURLs;
}

export type ExtractedPageData = {
  url: string;
  heading: string;
  first_paragraph: string;
  outgoing_links: string[];
  image_urls: string[];
};

export function extractPageData(
  html: string,
  pageURL: string,
): ExtractedPageData {
  return {
    url: pageURL,
    heading: getHeadingFromHTML(html),
    first_paragraph: getFirstParagraphFromHTML(html),
    outgoing_links: getURLsFromHTML(html, pageURL),
    image_urls: getImagesFromHTML(html, pageURL),
  };
}

export async function getHTML(
  url: string,
): Promise<string | undefined> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "BootCrawler/1.0" },
    });

    if (response.status >= 400) {
      console.error(
        `Error fetching URL: ${url}, status: ${response.status}`,
      );
      return undefined;
    }

    const contentType = response.headers.get("content-type");

    if (!contentType?.includes("text/html")) {
      console.error(`Error: response is not HTML for URL: ${url}`);
      return undefined;
    }

    return await response.text();
  } catch (error) {
    console.error(`Error fetching URL: ${url}`, error);
    return undefined;
  }
}

export class ConcurrentCrawler {
  private baseURL: string;
  private pages: Record<string, ExtractedPageData>;
  private limit: ReturnType<typeof pLimit>;
  private maxPages: number;
  private shouldStop: boolean;
  private visited: Set<string>;

  constructor(
    baseURL: string,
    maxConcurrency: number = 3,
    maxPages: number = 10,
  ) {
    this.baseURL = baseURL;
    this.pages = {};
    this.limit = pLimit(maxConcurrency);
    this.maxPages = maxPages;
    this.shouldStop = false;
    this.visited = new Set<string>();
  }

  private addPageVisit(normalizedURL: string): boolean {
    if (this.shouldStop) return false;
    if (this.visited.has(normalizedURL)) return false;

    if (this.visited.size >= this.maxPages) {
      this.shouldStop = true;
      console.log("Reached maximum number of pages to crawl.");
      return false;
    }

    this.visited.add(normalizedURL);
    return true;
  }

  private async getHTML(currentURL: string): Promise<string> {
    return await this.limit(async () => {
      const response = await fetch(currentURL, {
        headers: { "User-Agent": "BootCrawler/1.0" },
      });

      if (response.status >= 400) {
        throw new Error(
          `Error fetching ${currentURL}: ${response.status}`,
        );
      }

      const contentType = response.headers.get("content-type");

      if (!contentType?.includes("text/html")) {
        throw new Error(
          `Invalid content type for ${currentURL}: ${contentType}`,
        );
      }

      return await response.text();
    });
  }

  private async crawlPage(currentURL: string): Promise<void> {
    if (this.shouldStop) return;

    let base: URL;
    let current: URL;

    try {
      base = new URL(this.baseURL);
      current = new URL(currentURL);
    } catch {
      return;
    }

    if (current.hostname !== base.hostname) return;

    const normalizedURL = normalizeURL(currentURL);

    if (!this.addPageVisit(normalizedURL)) return;

    console.log(`Crawling: ${currentURL}`);

    let html: string;

    try {
      html = await this.getHTML(currentURL);
    } catch (error) {
      console.error(`Failed to crawl ${currentURL}:`, error);
      return;
    }

    const data = extractPageData(html, currentURL);
    this.pages[normalizedURL] = data;

    const crawlPromises = data.outgoing_links.map((nextURL) =>
      this.crawlPage(nextURL),
    );

    await Promise.all(crawlPromises);
  }

  public async crawl(): Promise<Record<string, ExtractedPageData>> {
    await this.crawlPage(this.baseURL);
    return this.pages;
  }
}

export async function crawlSiteAsync(
  baseURL: string,
  maxConcurrency: number = 3,
  maxPages: number = 10,
): Promise<Record<string, ExtractedPageData>> {
  const crawler = new ConcurrentCrawler(
    baseURL,
    maxConcurrency,
    maxPages,
  );

  return await crawler.crawl();
}
