import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import WebSocket from 'ws';

const baseUrl =
  process.argv.find((arg) => arg.startsWith('--base-url='))?.slice(11) ?? 'http://localhost:3000';
const quick = process.argv.includes('--interactions-only');
const output = path.resolve('artifacts/hdoors-redesign');
await mkdir(output, { recursive: true });
const chrome = spawn(
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  [
    '--headless=new',
    '--no-first-run',
    '--remote-debugging-port=9333',
    `--user-data-dir=${path.resolve('.next/hdoors-visual-browser')}`,
    'about:blank',
  ],
  { windowsHide: true, stdio: 'ignore' },
);
let targets;
for (let attempt = 0; attempt < 200; attempt++) {
  try {
    targets = await fetch('http://127.0.0.1:9333/json').then((r) => r.json());
    if (targets.length) break;
  } catch {
    /* Waiting for Chrome. */
  }
  await new Promise((resolve) => setTimeout(resolve, 100));
}
if (!targets?.length) throw new Error('Chrome did not start.');
const socket = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.once('open', resolve);
  socket.once('error', reject);
});
let sequence = 0;
let currentRoute = 'about:blank';
const pending = new Map();
const errors = [];
socket.on('message', (raw) => {
  const message = JSON.parse(raw.toString());
  if (message.id) {
    const callback = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) callback?.reject(new Error(message.error.message));
    else callback?.resolve(message.result);
  }
  if (message.method === 'Runtime.exceptionThrown')
    errors.push({
      route: currentRoute,
      message:
        message.params.exceptionDetails.exception?.description ??
        message.params.exceptionDetails.text,
    });
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
  if (response.exceptionDetails)
    throw new Error(
      response.exceptionDetails.exception?.description ?? response.exceptionDetails.text,
    );
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
  currentRoute = route;
  await send('Page.navigate', { url: new URL(route, baseUrl).href });
  await until(
    `location.pathname === ${JSON.stringify(new URL(route, baseUrl).pathname)} && document.readyState === 'complete' && !!document.querySelector('main h1')`,
  );
  await until(
    '[...document.images].filter(i=>i.getBoundingClientRect().top<innerHeight).every(i=>i.complete)',
  );
  await evaluate('document.fonts.ready.then(()=>true)');
}
async function viewport(width) {
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height: width < 768 ? 844 : 1000,
    deviceScaleFactor: 1,
    mobile: width < 768,
  });
}
async function screenshot(name, full = false) {
  const metrics = full ? await send('Page.getLayoutMetrics') : null;
  const image = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: full,
    ...(metrics
      ? {
          clip: {
            x: 0,
            y: 0,
            width: metrics.cssContentSize.width,
            height: metrics.cssContentSize.height,
            scale: 1,
          },
        }
      : {}),
  });
  await writeFile(path.join(output, `${name}.png`), Buffer.from(image.data, 'base64'));
}
await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');
const report = { baseUrl, checks: [], consoleErrors: errors };
report.heroSlides = [];
report.homeLocaleChecks = [];
try {
  const catalog = JSON.parse(
    await readFile('data/imports/hdoors-initial-catalog/catalog.json', 'utf8'),
  );
  if (!quick) {
    for (const width of [390, 768, 1366, 1920]) {
      await viewport(width);
      await navigate('/hy');
      await until("document.querySelector('.entrance-video')?.readyState >= 2");
      const state = await evaluate(
        "({ width:innerWidth, scroll:document.documentElement.scrollWidth, hero:!!document.querySelector('.entrance-video'), videoReady:document.querySelector('.entrance-video').readyState, videoPaused:document.querySelector('.entrance-video').paused, collections:document.querySelectorAll('.collection-card').length, cards:document.querySelectorAll('.product-card').length, brokenImages:[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.alt), footer:getComputedStyle(document.querySelector('footer')).display })",
      );
      report.checks.push({ route: '/hy', viewport: width, ...state });
      await screenshot(`home-hy-${width}`);
      if (width === 390) await screenshot('home-hy-390-full', true);
      if (width === 1366) await screenshot('home-hy-full', true);
      if (width === 1366) {
        await evaluate("document.querySelector('.entrance-skip').click();true");
        await until("location.hash==='#showroom'");
        report.skipToProducts = await evaluate(
          "Math.abs(document.querySelector('#showroom').getBoundingClientRect().top) < 140",
        );
        for (const progress of [0, 0.35, 0.65, 0.9]) {
          await evaluate(
            `(()=>{const scene=document.querySelector('.entrance-sequence');const top=scene.getBoundingClientRect().top+scrollY;scrollTo(0,top+(scene.offsetHeight-innerHeight)*${progress});return true})()`,
          );
          await new Promise((resolve) => setTimeout(resolve, 250));
          report.heroSlides.push(
            await evaluate(
              `(()=>{const video=document.querySelector('.entrance-video');const scene=document.querySelector('.entrance-sequence');return {progress:${progress},currentTime:Number(video.currentTime.toFixed(3)),duration:Number(video.duration.toFixed(3)),seeking:video.seeking,paused:video.paused,readyState:video.readyState,videoOpacity:getComputedStyle(video).opacity,videoDisplay:getComputedStyle(video).display,sceneReady:scene.dataset.videoReady??null,sceneProgress:getComputedStyle(scene).getPropertyValue('--entrance-progress')}})()`,
            ),
          );
          await screenshot(`home-hy-1366-entrance-${String(progress).replace('.', '-')}`);
        }
        await evaluate(
          "(()=>{const scene=document.querySelector('.entrance-sequence');const top=scene.getBoundingClientRect().top+scrollY;scrollTo(0,top+(scene.offsetHeight-innerHeight)*.25);return true})()",
        );
        await new Promise((resolve) => setTimeout(resolve, 250));
        report.reverseScroll = await evaluate(
          "(()=>{const video=document.querySelector('.entrance-video');return {progress:Number(getComputedStyle(document.querySelector('.entrance-sequence')).getPropertyValue('--entrance-progress')),currentTime:Number(video.currentTime.toFixed(3)),seeking:video.seeking}})()",
        );

        await evaluate(
          "(()=>{const scene=document.querySelector('.entrance-sequence');const top=scene.getBoundingClientRect().top+scrollY;scrollTo(0,top+(scene.offsetHeight-innerHeight)*.58);return true})()",
        );
        await new Promise((resolve) => setTimeout(resolve, 300));
        await evaluate('location.reload();true');
        await until("document.querySelector('.entrance-video')?.readyState >= 2");
        await until('scrollY > 100');
        await new Promise((resolve) => setTimeout(resolve, 250));
        report.reloadWhileScrolled = await evaluate(
          "(()=>{const video=document.querySelector('.entrance-video');return {scrollY,progress:Number(getComputedStyle(document.querySelector('.entrance-sequence')).getPropertyValue('--entrance-progress')),currentTime:Number(video.currentTime.toFixed(3))}})()",
        );
        for (const [name, selector] of [
          ['showroom', '#showroom'],
          ['collections', '.home-collections'],
          ['about', '.home-about'],
        ]) {
          await evaluate(
            `document.querySelector(${JSON.stringify(selector)}).scrollIntoView();true`,
          );
          await new Promise((resolve) => setTimeout(resolve, 350));
          await until(
            '[...document.images].filter(i=>i.getBoundingClientRect().top<innerHeight&&i.getBoundingClientRect().bottom>0).every(i=>i.complete)',
          );
          await screenshot(`home-hy-1366-${name}`);
        }
      }
      if (state.scroll > width + 1 || !state.hero || state.collections !== 3 || state.cards !== 4)
        throw new Error(`Homepage check failed at ${width}.`);
    }
    for (const locale of ['en', 'ru']) {
      for (const width of [390, 1366]) {
        await viewport(width);
        await navigate(`/${locale}`);
        const state = await evaluate(
          "({locale:document.querySelector('main').closest('[lang]')?.lang,width:innerWidth,scroll:document.documentElement.scrollWidth,fontFamily:getComputedStyle(document.querySelector('.home-hero h1')).fontFamily,heroTitleHeight:document.querySelector('.home-hero h1').getBoundingClientRect().height,heroHeight:document.querySelector('.home-hero').getBoundingClientRect().height})",
        );
        report.homeLocaleChecks.push({ route: `/${locale}`, viewport: width, ...state });
        await screenshot(`home-${locale}-${width}`);
        if (state.scroll > width + 1) throw new Error(`Homepage overflow /${locale} at ${width}.`);
      }
    }
    await send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });
    await viewport(1366);
    await navigate('/hy');
    report.reducedMotion = await evaluate(
      "({sceneHeight:document.querySelector('.entrance-sequence').getBoundingClientRect().height,position:getComputedStyle(document.querySelector('.entrance-stage')).position,videoDisplay:getComputedStyle(document.querySelector('.entrance-video')).display,posterDisplay:getComputedStyle(document.querySelector('.entrance-poster')).display,products:document.querySelectorAll('.product-card').length})",
    );
    await screenshot('home-hy-reduced-motion-1366');
    await send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }],
    });
    await send('Network.setCacheDisabled', { cacheDisabled: true });
    await send('Network.setBlockedURLs', { urls: ['*hdoors-entrance-scroll.mp4*'] });
    await navigate('/hy');
    await evaluate(
      "(()=>{const video=document.querySelector('.entrance-video');video.src='/assets/video/hdoors-entrance-scroll.mp4?failure-test=1';video.load();return true})()",
    );
    await until("document.querySelector('.entrance-sequence')?.dataset.videoError === 'true'");
    report.videoFailureFallback = await evaluate(
      "({sceneHeight:Math.round(document.querySelector('.entrance-sequence').getBoundingClientRect().height),stagePosition:getComputedStyle(document.querySelector('.entrance-stage')).position,skipVisible:!!document.querySelector('.entrance-skip')?.getClientRects().length,products:document.querySelectorAll('.product-card').length})",
    );
    await screenshot('home-hy-video-failure-1366');
    await send('Network.setBlockedURLs', { urls: [] });
    await send('Network.setCacheDisabled', { cacheDisabled: false });
    await viewport(1440);
    for (const locale of ['hy', 'en', 'ru']) {
      for (const route of [
        `/${locale}/products?pageSize=48`,
        `/${locale}/products/${catalog.products[0].translations[locale].slug}`,
        ...[
          'login',
          'register',
          'forgot-password',
          'reset-password',
          'verify-email',
          'cart',
          'checkout',
          'about',
          'contact',
          'blog',
          'legal/privacy',
          'legal/terms',
        ].map((p) => `/${locale}/${p}`),
      ]) {
        await navigate(route);
        const state = await evaluate(
          "({title:document.querySelector('main h1')?.textContent,width:innerWidth,scroll:document.documentElement.scrollWidth,cards:document.querySelectorAll('.product-card').length})",
        );
        report.checks.push({ route, viewport: 1440, ...state });
        if (state.scroll > state.width + 1) throw new Error(`Overflow ${route}.`);
        if (route.includes('pageSize=48') && state.cards !== 29)
          throw new Error(`${locale}: expected 29 catalog cards, got ${state.cards}.`);
        if (locale === 'hy' && /products|login|checkout/.test(route))
          await screenshot(`route-${locale}-${route.split('/').at(-1).split('?')[0]}`);
      }
      console.log(`Verified ${locale} desktop routes.`);
    }
  }
  for (const width of [390, 768]) {
    await viewport(width);
    for (const route of [
      '/hy/products?pageSize=48',
      `/hy/products/${catalog.products[0].translations.hy.slug}`,
      '/hy/login',
      '/hy/checkout',
      '/hy/contact',
    ]) {
      await navigate(route);
      const state = await evaluate(
        '({width:innerWidth,scroll:document.documentElement.scrollWidth})',
      );
      report.checks.push({ route, viewport: width, ...state });
      if (state.scroll > state.width + 1) throw new Error(`Overflow ${route} at ${width}.`);
      if (width === 390 && route.includes('/products?pageSize=48')) {
        await evaluate("document.querySelector('.catalog-filter-trigger').click();true");
        await until("!!document.querySelector('[role=dialog] .catalog-filter-fields')");
        await evaluate('new Promise((resolve) => setTimeout(resolve, 400))');
        report.mobileFilterDrawer = await evaluate(
          "({open:!!document.querySelector('[role=dialog] .catalog-filter-fields'),focused:document.querySelector('[role=dialog]').contains(document.activeElement),width:Math.round(document.querySelector('[role=dialog] .catalog-filter-sheet').getBoundingClientRect().width)})",
        );
        await screenshot('mobile-products-filter');
        await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
        await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' });
        await until("!document.querySelector('[role=dialog]')");
      }
      if (width === 390) await screenshot(`mobile-${route.split('/').at(-1).split('?')[0]}`);
    }
  }
  await viewport(1440);
  await navigate('/en/products?pageSize=48');
  await evaluate(
    "const form=document.querySelector('.catalog-sort-control');form.querySelector('[name=sort]').value='price_asc';form.requestSubmit();true",
  );
  await until("location.search.includes('sort=price_asc')");
  await evaluate('history.back();true');
  await until("!location.search.includes('sort=price_asc')");
  report.sortAndBackNavigation = true;
  await evaluate(
    "document.querySelector('#header-search').value='Mirella';document.querySelector('#header-search').form.requestSubmit();true",
  );
  await until(
    "location.search.includes('q=Mirella') && document.querySelectorAll('.product-card').length===1",
  );
  report.searchVerified = true;
  await navigate('/en/products?category=glazed-doors&pageSize=48');
  report.glazedFilterCards = await evaluate("document.querySelectorAll('.product-card').length");
  await navigate(`/en/products/${catalog.products[0].translations.en.slug}`);
  await evaluate('document.querySelector(\'main ul button[aria-pressed="false"]\')?.click();true');
  report.gallerySelection = await evaluate(
    'document.querySelectorAll(\'main ul button[aria-pressed="true"]\').length===1',
  );
  await evaluate(
    "[...document.querySelectorAll('main button')].find(b=>b.textContent.trim()==='Add to cart').click();true",
  );
  await until("document.querySelector('main [role=\"status\"]')?.textContent.includes('Added')");
  report.addToCart = true;
  await evaluate(
    'const trigger=document.querySelector(\'header button[aria-label="Cart"]\');trigger.focus();trigger.click();true',
  );
  await until('!!document.querySelector(\'[role="dialog"]\')');
  await until('document.querySelector(\'[role="dialog"]\').contains(document.activeElement)');
  report.cartDialog = await evaluate(
    '({focusedInside:document.querySelector(\'[role="dialog"]\').contains(document.activeElement)})',
  );
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' });
  await until('!document.querySelector(\'[role="dialog"]\')');
  await navigate('/en/checkout');
  report.checkoutForm = await evaluate(
    '({contact:!!document.querySelector(\'[name="firstName"]\'),cod:/Cash on delivery/i.test(document.body.textContent),noSubmit:true})',
  );
  await screenshot('checkout-with-guest-cart');
  await navigate('/en/cart');
  await evaluate(
    "[...document.querySelectorAll('main button')].find(b=>b.textContent.trim()==='Remove item')?.click();true",
  );
  await until("document.querySelector('main').textContent.includes('Your cart is empty.')");
  report.testCartLineRemoved = true;
  await navigate('/en/products?pageSize=48');
  await evaluate(
    'document.querySelector(\'.product-card button[aria-label="Wishlist"]\').click();true',
  );
  await until("location.pathname==='/en/login'");
  report.wishlistGuestRedirect = true;
  await navigate('/en/login');
  report.authNativeValidation = await evaluate(
    "!document.querySelector('main form').checkValidity()",
  );
  const draft = catalog.products.find((p) => p.recordKey === 'belwooddoors-event-1-graphite-900');
  report.draftHidden = !(
    await fetch(new URL(`/en/products/${draft.translations.en.slug}`, baseUrl)).then((r) =>
      r.text(),
    )
  ).includes(draft.translations.en.title);
  console.log(
    JSON.stringify(
      {
        checkedRoutes: report.checks.length,
        consoleErrors: errors,
        searchVerified: report.searchVerified,
        glazedFilterCards: report.glazedFilterCards,
        gallerySelection: report.gallerySelection,
        addToCart: report.addToCart,
        cartDialog: report.cartDialog,
        checkoutForm: report.checkoutForm,
        wishlistGuestRedirect: report.wishlistGuestRedirect,
        draftHidden: report.draftHidden,
      },
      null,
      2,
    ),
  );
} finally {
  await writeFile(
    path.join(output, quick ? 'interactions-report.json' : 'report.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  await send('Browser.close').catch(() => {});
  socket.close();
  chrome.kill();
}
