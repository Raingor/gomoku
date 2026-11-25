import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const base = process.env.GAME_URL || 'http://127.0.0.1:4311/';
const out = fileURLToPath(new URL('../artifacts/', import.meta.url));
const errors = [];
const checks = [];
let failure;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const check = (name, value) => { assert.ok(value, name); checks.push(name); console.log('PASS', name); };

try {
  await mkdir(out, { recursive: true });
  for (const [width, height, touch] of [[1440, 900, false], [390, 844, true], [360, 800, true]]) {
    const label = `${width}${touch ? '-touch' : '-desktop'}`;
    const context = await browser.newContext({ viewport: { width, height }, isMobile: touch, hasTouch: touch, deviceScaleFactor: 1 });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(`${label} pageerror ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') errors.push(`${label} console ${m.text()}`); });
    page.on('response', r => { if (r.status() >= 400) errors.push(`${label} HTTP ${r.status()} ${r.url()}`); });
    await page.goto(base, { waitUntil: 'networkidle' });
    check(`${label}: 页面加载且标题正确`, (await page.title()).includes('五子棋'));
    check(`${label}: 棋盘存在`, await page.locator('svg.board').count() === 1);
    check(`${label}: 小熊图片加载`, await page.locator('img').evaluate(img => img.complete && img.naturalWidth > 0));
    check(`${label}: 初始为空棋盘`, await page.locator('circle.stone').count() === 0);
    const before = await page.locator('circle.stone').count();
    const box = await page.locator('svg.board').boundingBox();
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    if (touch) await page.touchscreen.tap(centerX, centerY); else await page.mouse.click(centerX, centerY);
    await page.waitForTimeout(900);
    const after = await page.locator('circle.stone').count();
    check(`${label}: 点击后玩家落子且 AI 应招`, after >= before + 2);
    check(`${label}: 状态文本更新`, (await page.locator('.status').textContent()).length > 4);
    check(`${label}: 无水平溢出`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    if (!touch) {
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(900);
      check(`${label}: 键盘移动并落子`, await page.locator('circle.stone').count() >= 4);
    }
    await page.locator('[data-action="restart"]').click();
    await page.waitForTimeout(300);
    check(`${label}: 重开后棋盘清空`, await page.locator('circle.stone').count() === 0);
    await page.screenshot({ path: `${out}/${label}.png`, fullPage: true });
    await context.close();
  }
  check('无 pageerror / console error / HTTP>=400', errors.length === 0);
} catch (error) {
  failure = error;
  console.error(error);
} finally {
  await writeFile(`${out}/browser-results.json`, JSON.stringify({ base, checks: checks.length, passed: checks, errors, failure: failure?.message || null }, null, 2));
  await browser.close();
}
if (failure) throw failure;
console.log(`Completed ${checks.length} checks.`);
