#!/usr/bin/env node
//
// check-composition.cjs <application-url> — open a composed application the way a user's
// browser does, and wait for each micro-frontend to render (appshellhq/appshell#16).
//
// Serving the right bytes isn't the same as composing them: a manifest the shell can't
// resolve, a remote that fails to load, or a shared dependency that no longer lines up all
// serve fine and render nothing. This is what catches those.
//
// Playwright is resolved from BROWSER_DIR, where the job installs it, so the repository
// doesn't carry a browser for one check.
const { createRequire } = require('node:module');
const path = require('node:path');

const base = (process.argv[2] ?? '').replace(/\/+$/, '');
if (!base) {
  console.error('usage: check-composition.cjs <application-url>');
  process.exit(2);
}

const { chromium } = createRequire(path.join(process.env.BROWSER_DIR ?? process.cwd(), 'noop.js'))(
  'playwright',
);

// A route each example declares, and text only that example renders.
const expected = [
  ['/', 'This application is composed from 3 micro-frontends.'],
  ['/ping', '@appshell/sample-mfe-ping'],
  ['/pong', '@appshell/sample-mfe-pong'],
];

(async () => {
  const browser = await chromium.launch();
  const failures = [];

  try {
    for (const [route, text] of expected) {
      const page = await browser.newPage();
      const errors = [];

      page.on('pageerror', (error) => errors.push(error.message));
      page.on('requestfailed', (request) =>
        errors.push(`${request.url()}: ${request.failure()?.errorText}`),
      );

      const url = route === '/' ? base : `${base}${route}`;

      try {
        await page.goto(url, { waitUntil: 'load' });
        await page.getByText(text, { exact: true }).first().waitFor({ timeout: 30_000 });
        console.log(`${url}: rendered "${text}"`);
      } catch (error) {
        failures.push(`${url}: "${text}" never rendered (${error.message.split('\n')[0]})`);
      }

      if (errors.length) failures.push(...errors.map((e) => `${url}: ${e}`));
      await page.close();
    }
  } finally {
    await browser.close();
  }

  if (failures.length) {
    failures.forEach((f) => console.error(`::error::${f}`));
    process.exit(1);
  }
})();
