#!/usr/bin/env node
/**
 * General-purpose Playwright screenshot tool
 * Usage: node screenshot.js <url> <output.png> [waitSeconds]
 */

const { chromium } = require('playwright');

async function captureScreenshot(url, outputPath, waitSeconds = 2) {
  console.log(`📸 Capturing screenshot of ${url}...`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });

  const page = await context.newPage();

  // Capture console logs
  const logs = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));

  // Capture errors
  const errors = [];
  page.on('pageerror', err => errors.push(err.toString()));

  try {
    console.log(`🌐 Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    console.log(`⏳ Waiting ${waitSeconds} seconds...`);
    await page.waitForTimeout(waitSeconds * 1000);

    console.log(`💾 Saving screenshot to ${outputPath}...`);
    await page.screenshot({ path: outputPath, fullPage: true });

    console.log(`✅ Screenshot saved successfully!`);

    if (logs.length > 0) {
      console.log(`\n📋 Console logs:`);
      logs.forEach(log => console.log(`  ${log}`));
    }

    if (errors.length > 0) {
      console.log(`\n❌ Errors:`);
      errors.forEach(err => console.log(`  ${err}`));
    }

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Parse arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node screenshot.js <url> <output.png> [waitSeconds]');
  process.exit(1);
}

const [url, outputPath, waitSeconds] = args;
captureScreenshot(url, outputPath, parseInt(waitSeconds) || 2);
