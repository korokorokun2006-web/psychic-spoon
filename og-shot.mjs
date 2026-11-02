import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const html = pathToFileURL(resolve("/workspace/.grok/og-card.html")).href;
const out = process.argv[2] || "/workspace/.grok/og-card-raw.png";
const browser = await chromium.launch({
  executablePath:
    "/opt/pw-browsers/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell",
  args: ["--no-sandbox", "--disable-gpu"],
  headless: true,
});
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
});
await page.goto(html, { waitUntil: "load" });
await page.evaluate(async () => {
  await document.fonts.ready;
});
await page.waitForTimeout(120);
await page.screenshot({ path: out, type: "png" });
await browser.close();
console.log("wrote", out);
