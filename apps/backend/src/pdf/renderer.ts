import puppeteer, { type Browser } from "puppeteer";
import { createChild } from "~/utils/logger";
import { renderPaperHtml, type RenderInput } from "~/pdf/template";

const log = createChild("pdf");

// Lazy-init shared browser; reused across renders for performance.
let browserPromise: Promise<Browser> | null = null;

function launch(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      // Honour PUPPETEER_EXECUTABLE_PATH (set in Docker images that bake their own Chromium)
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });
  }
  return browserPromise;
}

export async function renderPdf(input: RenderInput): Promise<Buffer> {
  const browser = await launch();
  const page = await browser.newPage();
  try {
    const html = renderPaperHtml(input);
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", right: "16mm", bottom: "20mm", left: "16mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}

export async function shutdownPdf(): Promise<void> {
  if (browserPromise) {
    try {
      const b = await browserPromise;
      await b.close();
    } catch (err) {
      log.warn({ err }, "browser close failed");
    } finally {
      browserPromise = null;
    }
  }
}
