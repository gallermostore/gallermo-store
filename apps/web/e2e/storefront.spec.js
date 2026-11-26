import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

const seed=JSON.parse(await readFile(new URL('../../../data/catalog.seed.json',import.meta.url),'utf8'));
const frame=seed.products.find(item=>item.categorySlug==='normal-frames');
const flag=seed.products.find(item=>item.categorySlug==='flags');
const production=process.env.GALLERMO_WEB_BUILD==='production';
const screen=(page,info,name)=>page.screenshot({path:info.outputPath(name+'.png'),animations:'disabled'});
const guest=page=>expect(page.locator('.desktop-nav a[href="/track-order"]')).toBeAttached();

test('SSR renders direct storefront routes and hydrates Router navigation',async({page,request})=>{
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{
    if(['error','warning'].includes(message.type())&&/hydrat|server html|did not match/i.test(message.text()))errors.push(message.text());
  });
  for(const [path,marker] of [['/','class="hero"'],['/shop','id="catalog-search"'],['/product/'+frame.slug,'class="product-detail"']]){
    const response=await request.get(path);
    expect(response.status(),`SSR response for ${path}`).toBe(200);
    expect(await response.text()).toContain(marker);
  }
  await page.goto('/product/'+frame.slug);
  await expect(page.getByRole('heading',{name:frame.name.en,exact:true})).toBeVisible();
  await guest(page);
  await page.evaluate(()=>{window.__gallermoNavigationProbe=true;});
  await page.locator('.desktop-nav a[href="/shop"]').click();
  await expect(page).toHaveURL(/\/shop$/);
  await expect(page.locator('#catalog-search')).toBeVisible();
  expect(await page.evaluate(()=>window.__gallermoNavigationProbe)).toBe(true);
  expect(errors).toEqual([]);
});

test('cold SSR styles, Arabic dark and HTTP statuses without JavaScript',async({browser,request,baseURL})=>{
  const context=await browser.newContext({javaScriptEnabled:false});
  await context.addCookies([{name:'gallermo_lang',value:'ar',url:baseURL},{name:'gallermo_theme',value:'dark',url:baseURL}]);
  const page=await context.newPage();
  const response=await page.goto(baseURL+'/shop?category=normal-frames');
  expect(response.status()).toBe(200);
  await expect(page.locator('html')).toHaveAttribute('dir','rtl');
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await expect(page.locator('.product-card')).toHaveCount(12);
  const stylesheet=await page.locator('link[rel="stylesheet"]').getAttribute('href');
  expect(stylesheet).toMatch(production?/^\/assets\/.+\.css$/:/^\/src\/styles\.css$/);
  if(production){
    const home=await request.get('/',{headers:{'Accept-Encoding':'gzip'}});
    expect(home.headers()['content-encoding']).toBe('gzip');
    expect(await home.text()).toMatch(/as="image" fetchpriority="high"[^>]+gallermo-hero-mobile\.webp/);
  }
  expect((await request.get('/product/unknown-fixture')).status()).toBe(404);
  expect((await request.get('/shop?minPrice=100&maxPrice=1')).status()).toBe(400);
  expect(await (await request.get('/robots.txt')).text()).toContain('Disallow: /');
  await context.close();
});

test('home, responsive containment, layered drawer and RTL carousel',async({page},info)=>{
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(['warning','error'].includes(message.type()))errors.push(message.text());});
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/');
  await guest(page);
  await expect(page.locator('.product-card')).toHaveCount(8);
  await expect(page.locator('.hero img')).toHaveCount(1);
 await expect.poll(()=>page.locator('.hero img').evaluate(image=>image.currentSrc)).toMatch(/hero-desktop\.webp$/);
  const center=await page.locator('.view-all a').last().boundingBox();
  expect(Math.abs(center.x+center.width/2-720)).toBeLessThan(2);
  for(const width of [320,375,390,440,768,1024,1440]){
    await page.setViewportSize({width,height:850});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
    expect(await page.locator('.product-card').first().evaluate(card=>{
      const photo=card.querySelector('img'),select=card.querySelector('select');
      return getComputedStyle(photo).objectFit==='contain'&&(!select||select.getBoundingClientRect().right<=card.getBoundingClientRect().right);
    })).toBe(true);
    if(width<=780){
      const logo=await page.locator('.brand').boundingBox();
      expect(logo.x).toBeLessThan(width/4);
    }
  }
  await page.setViewportSize({width:390,height:844});
  await expect.poll(()=>page.locator('.hero img').evaluate(img=>img.currentSrc)).toMatch(/hero-mobile\.webp$/);
  const stage=page.locator('.depth-stage');
  const indicator=page.locator('.depth-indicators [aria-current=true]');
  const forward=page.locator('.depth-controls > button').last();
  await forward.click();
  await expect(indicator).not.toHaveAccessibleName('Normal Frames');
  const moved=await stage.locator('[data-active=true] a').getAttribute('href');
  await stage.dispatchEvent('pointerdown',{pointerId:2,pointerType:'touch',isPrimary:true,button:0,clientX:280,clientY:420});
  await stage.dispatchEvent('pointerup',{pointerId:2,pointerType:'touch',isPrimary:true,button:0,clientX:150,clientY:426});
  await expect(stage.locator('[data-active=true] a')).not.toHaveAttribute('href',moved);
  await screen(page,info,'mobile-en-light');
  const opener=page.getByRole('button',{name:'Open menu'});
  const original=await opener.boundingBox();
  await opener.click();
  const menu=page.locator('.navigation-drawer');
  const close=menu.getByRole('button',{name:'Close menu'});
  await expect(menu).toBeVisible();
  expect((await close.boundingBox()).x).toBeCloseTo(original.x,0);
  expect((await close.boundingBox()).y).toBeCloseTo(original.y,0);
  await expect(menu.getByRole('button')).toHaveCount(1);
  await close.evaluate(button=>{button.click();button.click();});
  await expect(menu).toHaveAttribute('data-state','open');
  await expect.poll(async()=>{const box=await menu.locator('.navigation-panel').boundingBox();return Math.round(box.x+box.width);}).toBe(390);
  await page.keyboard.press('Escape');
  await expect(menu).not.toBeVisible();
  await expect(opener).toBeFocused();
  await expect(page.locator('.why-cards article')).toHaveCount(4);
  await expect(page.locator('.view-all a.button-primary')).toHaveCount(2);
  const announcement=page.locator('.announcement');
  await expect(announcement.getByText("It's not over yet.",{exact:true})).toHaveCount(1);
  await announcement.getByRole('button',{name:'Pause motion'}).click();
  await expect(announcement.locator('.motion-track')).toHaveCSS('animation-play-state','paused');
  await page.locator('.header-actions button').first().click();
  await page.locator('.header-actions button').nth(1).click();
  await expect(announcement).toHaveAttribute('dir','rtl');
  await expect(announcement).toContainText('لسه الحكاية مخلصتش.');
  await expect(page.locator('.benefits')).toHaveAttribute('dir','rtl');
  await expect(page.locator('.benefits ul[aria-hidden=true]')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('dir','rtl');
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await stage.focus();
  await page.keyboard.press('ArrowRight');
  await expect(stage.locator('[data-active=true] a')).toHaveAttribute('href',/category=flags/);
  await expect(page.locator('body')).not.toContainText('—');
  await page.setViewportSize({width:1440,height:900});
  expect(errors).toEqual([]);
});

test('shop filter draft, sort, pagination, back, reload and empty state',async({page},info)=>{
  await page.setViewportSize({width:390,height:844});
  let productRequests=0;
  page.on('request',req=>{if(req.url().includes('/api/products?'))productRequests++;});
  await page.goto('/shop');
  await guest(page);
  expect(productRequests).toBe(0);
  const filters=page.getByRole('button',{name:'Filters',exact:true});
  const dialog=page.getByRole('dialog',{name:'Filters'});
  await filters.click();
  await dialog.locator('summary').first().click();
  await dialog.locator('[name=category]').selectOption('normal-frames');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  expect(page.url()).not.toContain('category=');
  await filters.click();
  await dialog.locator('summary').first().click();
  await dialog.locator('[name=category]').selectOption('normal-frames');
  await dialog.locator('summary').nth(1).click();
  await dialog.locator('[name=availability]').selectOption('in_stock');
  await dialog.getByRole('button',{name:'View results'}).click();
  await expect(page).toHaveURL(/category=normal-frames/);
  await expect(page.locator('.product-card')).toHaveCount(12);
  await expect(page.getByRole('region',{name:'Results'})).toBeFocused();
  await page.getByRole('button',{name:'Sort by',exact:true}).click();
  const sort=page.getByRole('dialog',{name:'Sort by'});
  await sort.getByRole('button',{name:/Price.*low.*high/i}).click();
  await expect(page).toHaveURL(/sort=price_asc/);
  await expect(page.locator('.product-card')).toHaveCount(12);
  await page.locator('.pagination a').last().click();
  await expect(page).toHaveURL(/page=2/);
  await page.goBack();
  await expect(page).not.toHaveURL(/page=2/);
  await page.reload();
  await expect(page).toHaveURL(/sort=price_asc/);
  await page.locator('#catalog-search').fill('no-such-fixture-design');
  await page.locator('.catalog-search button').click();
  await expect(page.locator('.empty-state')).toBeVisible();
});

test('product size, private designs, distinct cart lines and deposit UI',async({page},info)=>{
  await page.goto('/product/'+frame.slug);
  await guest(page);
  await expect(page.getByRole('heading',{name:frame.name.en})).toBeVisible();
  await expect(page.locator('.product-card')).toHaveCount(4);
  await expect(page.locator('.thumbnails')).toHaveCount(0);
  await page.getByRole('button',{name:'Size Guide',exact:true}).click();
  await expect(page.locator('.frame-chart img')).toBeVisible();
  await page.keyboard.press('Escape');
  const price=await page.locator('.detail-price').textContent();
  await page.locator('.size-buttons button').nth(1).click();
  expect(await page.locator('.detail-price').textContent()).not.toBe(price);
  await page.getByText('About this size',{exact:true}).click();
  await expect(page.getByText(/Close to an A3 sheet/)).toBeVisible();
  await screen(page,info,'product-size-guide');
  const custom=page.getByRole('button',{name:'Customize this',exact:true});
  const upload=page.getByRole('dialog',{name:'Your artwork'});
  const media=seed.products.slice(0,2).map(product=>'apps/web/public'+product.images[0].url);
  await custom.click();
  await upload.locator('input[type=file]').setInputFiles(media[0]);
  await expect(upload.locator('.artwork-preview')).toBeVisible();
  await upload.getByRole('button',{name:'Cancel'}).click();
  await expect(upload).not.toBeVisible();
  await expect(custom).toBeFocused();
  for(const file of media){
    await custom.click();
    await upload.locator('input[type=file]').setInputFiles(file);
    await upload.getByRole('button',{name:'Add customized item'}).click();
    await expect(upload).not.toBeVisible();
  }
  await page.locator('.nav-cart').click();
  await expect(page.locator('.cart-line')).toHaveCount(2);
  await page.reload();
  const previews=page.locator('.cart-line img[src*="/api/private/"]');
  await expect(previews).toHaveCount(2);
  const previous=await previews.first().getAttribute('src');
  await page.getByRole('button',{name:'Replace artwork'}).first().click();
  await upload.locator('input[type=file]').setInputFiles(media[1]);
  await upload.getByRole('button',{name:'Save replacement artwork'}).click();
  await expect(previews.first()).not.toHaveAttribute('src',previous);
  await expect(previews).toHaveCount(2);
  await page.getByRole('link',{name:'Checkout',exact:true}).click();
  await page.locator('.checkout-fields select').selectOption('cairo');
  await expect(page.getByRole('radio',{name:/50% InstaPay deposit/})).toBeChecked();
  const discount=page.locator('.discount-row input');
  await discount.fill('WRONG-CODE');
  await page.getByRole('button',{name:'Apply discount'}).click();
  await expect(page.locator('.toast-stack [role=alert]')).toHaveText('That discount code is unavailable');
  await expect(page.getByRole('radio',{name:/50% InstaPay deposit/})).toBeChecked();
  await discount.fill('FIXTURE10');
  await page.getByRole('button',{name:'Apply discount'}).click();
  await expect(page.locator('.toast-stack [role=status]')).toHaveText('Discount applied');
  await page.getByRole('button',{name:'Dismiss notification'}).click();
  await expect(page.locator('.store-toast')).toHaveCount(0);
  await expect(page.locator('.summary-line').filter({hasText:'Shipping'})).toContainText('90');
  await page.locator('.checkout-fields select').selectOption('alexandria');
  await expect(page.locator('.summary-line').filter({hasText:'Shipping'})).toContainText('120');
  await expect(page.getByRole('radio',{name:'Cash on delivery'})).toHaveCount(0);
  await expect(page.getByText('Due at delivery',{exact:true})).toBeVisible();
  await page.getByLabel('Full name').fill('Browser deposit fixture');
  await page.getByRole('textbox',{name:'Email',exact:true}).fill('deposit-browser@example.invalid');
  await page.getByLabel('Phone number').fill('01012345678');
  await page.getByLabel('Full delivery address').fill('Browser fixture street address');
  await page.getByLabel('Transfer reference').fill('DEPOSIT-BROWSER-001');
  await page.getByLabel('Transfer screenshot').setInputFiles(media[0]);
  await page.getByRole('button',{name:'Place order',exact:true}).click();
  await expect(page).toHaveURL(/order-confirmed/);
  await expect(page.getByText('We received your transfer screenshot. Verification is pending.')).toBeVisible();
  await page.goto('/product/'+flag.slug);
  await expect(page.getByRole('button',{name:'Customize this',exact:true})).toHaveCount(0);
});

test('guest, admin and customer navigation and route guards',async({page})=>{
  await page.goto('/');
  await guest(page);
  await page.locator('.auth-icon').click();
  await page.getByRole('textbox',{name:'Email',exact:true}).fill('staff@example.invalid');
  await page.getByLabel('Password').fill('fixture-only-gallermo-2026');
  await page.locator('form button[type=submit]').click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.locator('.desktop-nav a[href="/admin"]')).toBeVisible();
  await page.getByRole('tab',{name:'Categories'}).click();
  await page.getByRole('button',{name:'Create',exact:true}).click();
  await page.getByLabel('Slug').fill('browser-fixture-category');
  await page.getByLabel('English name').fill('Browser fixture category');
  await page.getByLabel('Arabic name').fill('فئة تجريبية');
  await page.getByLabel('Published',{exact:true}).check();
  await page.getByLabel('Requires 50% InstaPay prepayment').check();
  await expect(page.getByLabel('Allow customer to upload their own design')).not.toBeChecked();
  await page.getByRole('button',{name:'Save',exact:true}).click();
  const edited=page.getByRole('row',{name:/Browser fixture category/});
  await edited.getByRole('button',{name:'Edit'}).click();
  await expect(page.getByLabel('Requires 50% InstaPay prepayment')).toBeChecked();
  await expect(page.getByLabel('Allow customer to upload their own design')).not.toBeChecked();
  await expect(page.locator('.desktop-nav a[href="/track-order"]')).toHaveCount(0);
  await page.goto('/track-order');
  await expect(page.locator('main form')).toHaveCount(0);
  await page.locator('.auth-icon').click();
  await guest(page);
  await page.goto('/register');
  await page.locator('form input').nth(0).fill('Browser fixture');
  await page.getByRole('textbox',{name:'Email',exact:true}).fill('browser-customer@example.invalid');
  await page.getByLabel('Password').fill('fixture-only-gallermo-2026');
  await page.locator('form button[type=submit]').click();
  await expect(page).toHaveURL(/\/account\/orders$/);
  await expect(page.locator('.desktop-nav a[href="/account/orders"]')).toBeVisible();
  await expect(page.locator('.desktop-nav a[href="/track-order"]')).toHaveCount(0);
});

test('legacy preferences migrate and reduced-motion drawer restores focus and scroll',async({page},info)=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.setViewportSize({width:375,height:812});
 await page.addInitScript(()=>{localStorage.setItem('gallermo:lang','ar');localStorage.setItem('gallermo:theme','dark');});
 await page.goto('/');
 await expect(page.locator('html')).toHaveAttribute('dir','rtl');
 await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await expect(page.locator('.announcement .motion-track')).toHaveCSS('animation-name','none');
 await expect(page.locator('.benefits .motion-track')).toHaveCSS('animation-name','none');
 await expect(page.locator('.benefits .motion-toggle')).toBeHidden();
 await guest(page);
 const opener=page.getByRole('button',{name:'فتح القائمة'});
 await opener.click();
 const drawer=page.getByRole('dialog',{name:'القائمة الرئيسية'});
 await expect(drawer).toBeVisible();
 expect(await page.evaluate(()=>document.body.style.overflow)).toBe('hidden');
 await page.keyboard.press('Escape');
 await expect(drawer).not.toBeVisible();
 await expect(opener).toBeFocused();
 expect(await page.evaluate(()=>document.body.style.overflow)).toBe('');
 await page.setViewportSize({width:844,height:390});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(844);
 await page.setViewportSize({width:1024,height:768});
 await page.locator('.header-actions button').first().click();
 await expect(page.locator('html')).toHaveAttribute('lang','en');
 await page.setViewportSize({width:390,height:844});
 await page.setViewportSize({width:1024,height:768});
 await page.locator('.header-actions button').first().click();
 await page.locator('.header-actions button').nth(1).click();
 await expect(page.locator('html')).toHaveAttribute('data-theme','light');
 await page.setViewportSize({width:390,height:844});
});

test('SSR content stays visible while the hydration script is delayed',async({page,context,baseURL})=>{
 await context.addCookies([{name:'gallermo_lang',value:'ar',url:baseURL},{name:'gallermo_theme',value:'dark',url:baseURL}]);
 let release;
 const delay=new Promise(resolve=>{release=resolve;});
 await page.route(production?/\/assets\/index-[^/]+\.js$/:/\/src\/entry-client\.jsx(?:\?.*)?$/,async route=>{
  await delay;
  await route.continue();
 });
 const navigation=page.goto('/shop?category=normal-frames',{waitUntil:'load'});
 try{
  await expect(page.getByRole('heading',{name:seed.categories.find(item=>item.slug==='normal-frames').name.ar})).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await expect(page.locator('.product-card')).toHaveCount(12);
  expect(await page.locator('.product-card img').first().evaluate(image=>getComputedStyle(image).objectFit)).toBe('contain');
  await expect(page.locator('.desktop-nav a[href="/track-order"]')).toHaveCount(0);
 }finally{release();}
 await navigation;
 await guest(page);
});
