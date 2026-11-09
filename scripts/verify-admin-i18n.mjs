import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import WebSocket from 'ws';

const baseUrl =
  process.argv.find((arg) => arg.startsWith('--base-url='))?.slice(11) ?? 'http://localhost:3000';
const email = process.env.SEED_ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD;
if (!email || !password) throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required.');

const output = path.resolve('artifacts/admin-i18n');
await mkdir(output, { recursive: true });
const port = 9444;
const chrome = spawn(
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  [
    '--headless=new',
    '--no-first-run',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${path.resolve(`.next/admin-i18n-browser-${process.pid}`)}`,
    'about:blank',
  ],
  { windowsHide: true, stdio: 'ignore' },
);

let targets;
for (let attempt = 0; attempt < 200; attempt++) {
  try {
    targets = await fetch(`http://127.0.0.1:${port}/json`).then((response) => response.json());
    if (targets.length) break;
  } catch {
    // Chrome is still starting.
  }
  await new Promise((resolve) => setTimeout(resolve, 100));
}
if (!targets?.length) throw new Error('Chrome did not start.');

const socket = new WebSocket(targets.find((target) => target.type === 'page').webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.once('open', resolve);
  socket.once('error', reject);
});

let sequence = 0;
const pending = new Map();
const consoleErrors = [];
socket.on('message', (raw) => {
  const message = JSON.parse(raw.toString());
  if (message.id) {
    const callback = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) callback?.reject(new Error(message.error.message));
    else callback?.resolve(message.result);
  }
  if (message.method === 'Runtime.exceptionThrown') {
    consoleErrors.push(
      message.params.exceptionDetails.exception?.description ??
        message.params.exceptionDetails.text,
    );
  }
});

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const response = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
  return response.result.value;
}

async function until(expression, timeout = 30000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await evaluate(expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Timed out: ${expression}`);
}

async function navigate(route) {
  await send('Page.navigate', { url: new URL(route, baseUrl).href });
  await until(
    `location.pathname === ${JSON.stringify(new URL(route, baseUrl).pathname)} && document.readyState === 'complete'`,
  );
  await evaluate('document.fonts.ready.then(() => true)');
}

async function viewport(width) {
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height: width < 768 ? 844 : 1000,
    deviceScaleFactor: 1,
    mobile: width < 768,
  });
}

async function screenshot(name) {
  const result = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(path.join(output, `${name}.png`), Buffer.from(result.data, 'base64'));
}

await send('Page.enable');
await send('Runtime.enable');

try {
  await viewport(1440);
  await navigate('/en/login?next=/en/admin');
  await evaluate(`(() => {
    const email = document.querySelector('input[name="email"]');
    const password = document.querySelector('input[name="password"]');
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setValue.call(email, ${JSON.stringify(email)});
    email.dispatchEvent(new Event('input', { bubbles: true }));
    setValue.call(password, ${JSON.stringify(password)});
    password.dispatchEvent(new Event('input', { bubbles: true }));
    email.form.requestSubmit();
    return true;
  })()`);
  await until("location.pathname === '/en/admin' || !!document.querySelector('[role=alert]')");
  if (await evaluate("!!document.querySelector('[role=alert]')"))
    throw new Error('Admin login failed.');

  const checks = [];
  for (const width of [390, 1440]) {
    await viewport(width);
    for (const locale of ['hy', 'ru', 'en']) {
      await navigate(`/${locale}/admin`);
      await until("!!document.querySelector('.admin-shell')");
      const state = await evaluate(`({
        locale: document.documentElement.lang,
        path: location.pathname,
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        navigation: [...document.querySelectorAll('aside nav a')].map((item) => item.textContent.trim()).filter(Boolean),
        language: document.querySelector('.admin-language-switcher button[aria-haspopup="listbox"]')?.textContent.trim() ?? null
      })`);
      checks.push({ width, requestedLocale: locale, ...state });
      await screenshot(`admin-${locale}-${width}`);
    }
  }

  await viewport(1440);
  await navigate('/en/admin');
  await evaluate(
    'document.querySelector(\'.admin-language-switcher button[aria-haspopup="listbox"]\').click(); true',
  );
  await until(
    "document.querySelector('[role=listbox]')?.closest('[aria-hidden]')?.getAttribute('aria-hidden') === 'false'",
  );
  const languageDropdown = await evaluate(`(() => {
    const trigger = document.querySelector('.admin-language-switcher button[aria-haspopup="listbox"]');
    const list = document.querySelector('.admin-language-switcher [role="listbox"]');
    const triggerRect = trigger.getBoundingClientRect();
    const listRect = list.getBoundingClientRect();
    return {
      options: list.querySelectorAll('[role="option"]').length,
      opensAbove: listRect.bottom <= triggerRect.top,
      visible: listRect.top >= 0 && listRect.bottom <= innerHeight,
      triggerTop: triggerRect.top,
      listTop: listRect.top,
      listBottom: listRect.bottom,
    };
  })()`);
  if (!languageDropdown.opensAbove || !languageDropdown.visible || languageDropdown.options !== 3) {
    throw new Error(`Language dropdown is clipped: ${JSON.stringify(languageDropdown)}`);
  }
  await screenshot('admin-language-dropdown-en-1440');
  await until(
    "!![...document.querySelectorAll('[role=option]')].find((button) => button.textContent.includes('Русский'))",
  );
  await evaluate(
    "[...document.querySelectorAll('[role=option]')].find((button) => button.textContent.includes('Русский')).click(); true",
  );
  await until("location.pathname === '/ru/admin'");

  const report = {
    checks,
    languageDropdown,
    localeSwitchPath: await evaluate('location.pathname'),
    consoleErrors,
  };
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      { checked: checks.length, localeSwitchPath: report.localeSwitchPath, consoleErrors },
      null,
      2,
    ),
  );
} finally {
  socket.close();
  chrome.kill();
}
