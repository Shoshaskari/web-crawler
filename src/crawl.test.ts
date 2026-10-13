import { describe, it, expect } from "vitest";
import {
  normalizeURL,
  getHeadingFromHTML,
  getFirstParagraphFromHTML,
  getURLsFromHTML,
  getImagesFromHTML,
} from "./crawl.js";

describe("normalizeURL", () => {
  it("removes the protocol", () => {
    expect(normalizeURL("https://www.boot.dev")).toBe("www.boot.dev");
  });

  it("removes the trailing slash", () => {
    expect(normalizeURL("https://www.boot.dev/")).toBe("www.boot.dev");
  });

  it("preserves the path", () => {
    expect(normalizeURL("https://www.boot.dev/about/team"))
      .toBe("www.boot.dev/about/team");
  });
});

describe("getHeadingFromHTML", () => {
  it("extracts an h1 heading", () => {
    expect(getHeadingFromHTML("<h1>Test Title</h1>")).toBe("Test Title");
  });

  it("uses h2 when h1 is missing", () => {
    expect(getHeadingFromHTML("<h2>Fallback Title</h2>"))
      .toBe("Fallback Title");
  });

  it("returns an empty string when no heading exists", () => {
    expect(getHeadingFromHTML("<p>Some text</p>")).toBe("");
  });
});

describe("getFirstParagraphFromHTML", () => {
  it("extracts the first paragraph", () => {
    expect(getFirstParagraphFromHTML("<p>First.</p><p>Second.</p>"))
      .toBe("First.");
  });

  it("prioritizes paragraphs inside main", () => {
    const html = "<p>Outside.</p><main><p>Main paragraph.</p></main>";
    expect(getFirstParagraphFromHTML(html)).toBe("Main paragraph.");
  });

  it("returns an empty string when no paragraph exists", () => {
    expect(getFirstParagraphFromHTML("<h1>Title</h1>")).toBe("");
  });
});

describe("getURLsFromHTML", () => {
  const baseURL = "https://crawler-test.com";

  it("converts relative URLs to absolute URLs", () => {
    const html = '<a href="/path/one">One</a>';
    expect(getURLsFromHTML(html, baseURL))
      .toEqual(["https://crawler-test.com/path/one"]);
  });

  it("extracts all anchor links", () => {
    const html = `
      <a href="/one">One</a>
      <a href="https://example.com/two">Two</a>
      <a href="/three">Three</a>
    `;
    expect(getURLsFromHTML(html, baseURL)).toEqual([
      "https://crawler-test.com/one",
      "https://example.com/two",
      "https://crawler-test.com/three",
    ]);
  });

  it("ignores anchors without href attributes", () => {
    const html = '<a>No URL</a><a href="/valid">Valid</a>';
    expect(getURLsFromHTML(html, baseURL))
      .toEqual(["https://crawler-test.com/valid"]);
  });
});

describe("getImagesFromHTML", () => {
  const baseURL = "https://crawler-test.com";

  it("converts relative image URLs to absolute URLs", () => {
    const html = '<img src="/logo.png" alt="Logo">';
    expect(getImagesFromHTML(html, baseURL))
      .toEqual(["https://crawler-test.com/logo.png"]);
  });

  it("extracts all image URLs", () => {
    const html = `
      <img src="/one.png">
      <img src="https://example.com/two.jpg">
      <img src="/three.svg">
    `;
    expect(getImagesFromHTML(html, baseURL)).toEqual([
      "https://crawler-test.com/one.png",
      "https://example.com/two.jpg",
      "https://crawler-test.com/three.svg",
    ]);
  });

  it("ignores images without src attributes", () => {
    const html = '<img alt="Missing source"><img src="/valid.png">';
    expect(getImagesFromHTML(html, baseURL))
      .toEqual(["https://crawler-test.com/valid.png"]);
  });
});

import { extractPageData } from "./crawl.js";

describe("extractPageData", () => {
  it("extracts all page data", () => {
    const inputURL = "https://crawler-test.com";
    const inputHTML = `
      <html><body>
        <h1>Test Title</h1>
        <p>This is the first paragraph.</p>
        <a href="/link1">Link 1</a>
        <img src="/image1.jpg" alt="Image 1">
      </body></html>
    `;

    expect(extractPageData(inputHTML, inputURL)).toEqual({
      url: "https://crawler-test.com",
      heading: "Test Title",
      first_paragraph: "This is the first paragraph.",
      outgoing_links: ["https://crawler-test.com/link1"],
      image_urls: ["https://crawler-test.com/image1.jpg"],
    });
  });

  it("handles a page with missing content", () => {
    const inputHTML = "<html><body><div>No content</div></body></html>";

    expect(extractPageData(inputHTML, "https://example.com")).toEqual({
      url: "https://example.com",
      heading: "",
      first_paragraph: "",
      outgoing_links: [],
      image_urls: [],
    });
  });

  it("extracts multiple links and images", () => {
    const inputHTML = `
      <html><body>
        <h2>Fallback Heading</h2>
        <main><p>Main paragraph.</p></main>
        <a href="/one">One</a>
        <a href="/two">Two</a>
        <img src="/one.png">
        <img src="/two.png">
      </body></html>
    `;

    expect(extractPageData(inputHTML, "https://example.com")).toEqual({
      url: "https://example.com",
      heading: "Fallback Heading",
      first_paragraph: "Main paragraph.",
      outgoing_links: [
        "https://example.com/one",
        "https://example.com/two",
      ],
      image_urls: [
        "https://example.com/one.png",
        "https://example.com/two.png",
      ],
    });
  });
});
