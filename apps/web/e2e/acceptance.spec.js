import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

const seed=JSON.parse(await readFile(new URL('../../../data/catalog.seed.json',import.meta.url),'utf8'));
const frame=seed.products.find(item=>item.categorySlug==='normal-frames');
const flag=seed.products.find(item=>item.categorySlug==='flags');
const photo='apps/web/public'+frame.images[0].url;
async function shoot(page,info,name){
 await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
 await page.evaluate(()=>Promise.race([
  Promise.allSettled([...document.images].filter(image=>image.getClientRects().length).map(image=>{
   image.loading='eager';
   return image.decode();
  })),
  new Promise(resolve=>setTimeout(resolve,2500))
 ]));
 await page.screenshot({path:info.outputPath(name+'.png'),fullPage:true,animations:'disabled'});
}
const ready=page=>expect(page.locator('.desktop-nav a[href="/track-order"]')).toBeAttached();

test('evidence: homepage geometry, English and Arabic drawer, FAQ and contact footer',async({page},info)=>{
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/');
 await ready(page);
 const desktopLogo=await page.locator('.brand').boundingBox();
 const nav=await page.locator('.desktop-nav').boundingBox();
 expect(desktopLogo.x).toBeLessThan(nav.x);
 expect(await page.locator('.brand').innerText()).toBe('');
 await expect(page.locator('.product-card')).toHaveCount(8);
 await expect(page.getByRole('heading',{name:'Best sellers',exact:true})).toHaveCount(0);
 await expect(page.locator('.hero img')).toHaveCount(0);
 const measurements=await page.locator('.category-image').evaluateAll(images=>images.map(image=>{
   const rect=image.getBoundingClientRect();
   return {width:rect.width,height:rect.height,fit:getComputedStyle(image.querySelector('img')).objectFit};
 }));
 expect(measurements.length).toBe(7);
 for(const image of measurements){
  expect(image.width/image.height).toBeCloseTo(4/3,1);
  expect(image.height).toBeCloseTo(measurements[0].height,0);
  expect(image.fit).toBe('contain');
 }
 const cta=await page.locator('.view-all').boundingBox();
 const grid=await page.locator('.product-grid').last().boundingBox();
 expect(cta.y).toBeGreaterThan(grid.y+grid.height);
 await shoot(page,info,'desktop-home-en-light-full');
 await page.locator('.faq-section button').nth(1).click();
 const summary=page.locator('.faq-section summary').first();
 await summary.focus();
 await page.keyboard.press('Enter');
 await expect(summary.locator('..')).toHaveAttribute('open','');
 await expect(page.locator('footer .footer-brand img')).toHaveCount(1);
 await expect(page.locator('footer a[href="tel:+201066041396"]')).toHaveCount(1);
 await expect(page.locator('footer a[href="/contact"]')).toHaveCount(1);
 await expect(page.locator('footer a[href="/cart"], footer a[href="/track-order"], footer a[href="/shop"]')).toHaveCount(0);
 const footerContrast=await page.locator('.footer-copy, footer .social-links a').evaluateAll(nodes=>{
  function luminance(color){
   const channels=color.match(/\d+(?:\.\d+)?/g).slice(0,3).map(Number).map(channel=>{
    const value=channel/255;
    return value<=.04045?value/12.92:((value+.055)/1.055)**2.4;
   });
   return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
  }
  return nodes.map(node=>{
   const foreground=luminance(getComputedStyle(node).color);
   const background=luminance(getComputedStyle(node.closest('footer')).backgroundColor);
   return (Math.max(foreground,background)+.05)/(Math.min(foreground,background)+.05);
  });
 });
 expect(footerContrast).toHaveLength(4);
 expect(Math.min(...footerContrast)).toBeGreaterThanOrEqual(4.5);
 await shoot(page,info,'desktop-home-faq-expanded-and-footer-full');

 await page.setViewportSize({width:320,height:850});
 const logo=await page.locator('.brand').boundingBox();
 const opener=page.getByRole('button',{name:'Open menu'});
 const toggle=await opener.boundingBox();
 const actions=await page.locator('.header-actions').boundingBox();
 expect(Math.abs(logo.x+logo.width/2-160)).toBeLessThanOrEqual(.5);
 expect(toggle.x+toggle.width).toBeLessThan(logo.x);
 expect(logo.x+logo.width).toBeLessThanOrEqual(actions.x);
 await expect(page.locator('body')).not.toContainText('—');
 await shoot(page,info,'mobile-320-en-menu-closed-full');
 await page.setViewportSize({width:390,height:850});
 await opener.click();
 const dialog=page.locator('.navigation-drawer');
 const panel=dialog.locator('.navigation-panel');
 await expect(dialog).toBeVisible();
 await expect.poll(async()=>Math.round((await panel.boundingBox()).x)).toBe(0);
 await expect.poll(()=>panel.evaluate(element=>element.getAnimations().every(animation=>animation.playState==='finished'))).toBe(true);
 await panel.evaluate(element=>{element.dataset.restarts='0';element.addEventListener('animationstart',()=>{element.dataset.restarts=String(Number(element.dataset.restarts)+1);});});
 await dialog.locator('.drawer-actions button').nth(1).click();
 await expect(page.locator('html')).toHaveAttribute('dir','rtl');
 await expect(panel).toHaveAttribute('data-restarts','0');
 await page.locator('.nav-cart').evaluate(element=>element.focus());
 expect(await dialog.evaluate(element=>element.contains(document.activeElement))).toBe(true);
 for(let i=0;i<8;i++){
  await page.keyboard.press('Tab');
  expect(await page.evaluate(()=>!document.activeElement.closest('header')||!!document.activeElement.closest('dialog'))).toBe(true);
 }
 await shoot(page,info,'mobile-rtl-menu-open-full');
 await page.keyboard.press('Escape');
 await expect(dialog).not.toBeVisible();
 await expect(page.getByRole('button',{name:'فتح القائمة'})).toBeFocused();
 await page.locator('.header-actions button').nth(1).click();
 await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await shoot(page,info,'mobile-rtl-dark-menu-closed-full');
});

test('evidence: shop and both drawers, product, cart and checkout screens',async({page},info)=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/shop');
 await ready(page);
 await shoot(page,info,'mobile-shop-full');
 await page.getByRole('button',{name:'Filters',exact:true}).click();
 const filters=page.getByRole('dialog',{name:'Filters'});
 await expect(filters).toBeVisible();
 await expect(filters.locator('[name=minPrice]')).toBeVisible();
 await shoot(page,info,'mobile-filters-drawer-full');
 await page.keyboard.press('Escape');
 await expect(filters).not.toBeVisible();
 await page.getByRole('button',{name:'Sort',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'Sort'})).toBeVisible();
 await shoot(page,info,'mobile-sort-drawer-full');
 await page.keyboard.press('Escape');

 await page.setViewportSize({width:1440,height:900});
 await page.goto('/product/'+frame.slug);
 await ready(page);
 await page.locator('.size-buttons button').nth(1).click();
 await page.getByText('Description',{exact:true}).click();
 await page.getByText('Size guide',{exact:true}).click();
 await expect(page.locator('.size-chart img')).toBeVisible();
 await expect(page.locator('.product-card')).toHaveCount(4);
 await expect(page.locator('.product-card a[href="/product/'+frame.slug+'"]')).toHaveCount(0);
 await shoot(page,info,'desktop-product-variant-description-chart-related-full');
 await page.getByRole('button',{name:'Customize this',exact:true}).click();
 const art=page.getByRole('dialog',{name:'Your artwork'});
 await art.locator('input[type=file]').setInputFiles(photo);
 await expect(art.locator('.artwork-preview')).toBeVisible();
 await shoot(page,info,'desktop-customization-preview-full');
 await art.getByRole('button',{name:'Add customized item'}).click();
 await expect(art).not.toBeVisible();
 await page.locator('.nav-cart').click();
 await expect(page.locator('.cart-line')).toHaveCount(1);
 await shoot(page,info,'desktop-customized-cart-full');
 await page.getByRole('link',{name:'Checkout',exact:true}).click();
 await page.locator('.checkout-fields select').selectOption('Cairo');
 await page.getByRole('button',{name:'Calculate total'}).click();
 await expect(page.getByRole('radio',{name:/50% InstaPay deposit/})).toBeChecked();
 await shoot(page,info,'desktop-prepayment-checkout-full');
 await page.locator('.nav-cart').click();
 await page.getByRole('button',{name:'Remove item',exact:true}).click();
 await expect(page.locator('.cart-line')).toHaveCount(0);
 await page.goto('/product/'+flag.slug);
 await ready(page);
 await page.getByRole('button',{name:'Add to cart',exact:true}).first().click();
 const animation=page.locator('.flying-cart-image');
 await expect(animation).toBeVisible();
 await expect.poll(()=>animation.evaluate(element=>getComputedStyle(element).transform),{timeout:4000}).not.toBe('none');
 await expect(animation).toHaveCount(0);
 await page.locator('.nav-cart').click();
 await page.getByRole('link',{name:'Checkout',exact:true}).click();
 await page.locator('.checkout-fields select').selectOption('Cairo');
 await page.getByRole('button',{name:'Calculate total'}).click();
 await expect(page.getByRole('radio',{name:'Cash on delivery'})).toBeChecked();
 await expect(page.getByRole('radio',{name:'InstaPay',exact:true})).toBeVisible();
 await shoot(page,info,'desktop-regular-checkout-full');
});

test('evidence: both category checkboxes and localized staging metadata',async({page,request},info)=>{
 const shop=await request.get('/shop?category=normal-frames&sort=price_asc');
 const html=await shop.text();
 expect(shop.status()).toBe(200);
 expect(html).toMatch(/rel="canonical" href="[^"]+\/shop\?category=normal-frames"/);
 expect(html).toContain('name="robots" content="noindex,nofollow"');
 expect((await request.get('/sitemap.xml')).status()).toBe(404);
 expect((await request.get('/product/not-a-fixture-product')).status()).toBe(404);
 await page.goto('/login');
 await page.getByLabel('Email').fill('staff@example.invalid');
 await page.getByLabel('Password').fill('fixture-only-gallermo-2026');
 await page.locator('form button[type=submit]').click();
 await expect(page).toHaveURL(/\/admin$/);
 await page.getByRole('tab',{name:'Categories'}).click();
 await page.getByRole('button',{name:'Create',exact:true}).click();
 await expect(page.getByLabel('Requires 50% InstaPay prepayment')).not.toBeChecked();
 await expect(page.getByLabel('Allow customer to upload their own design')).not.toBeChecked();
 await shoot(page,info,'desktop-admin-both-category-checkboxes-full');
});
