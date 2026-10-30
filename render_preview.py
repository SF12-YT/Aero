import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path('/mnt/data/AeroLab25/app/src/main/assets')
html=(ROOT/'index.html').read_text()
js=(ROOT/'model.js').read_text()
html=html.replace('<script src="model.js"></script>', '<script>'+js.replace('</script>','<\\/script>')+'</script>')
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--enable-webgl','--ignore-gpu-blocklist','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage','--enable-unsafe-swiftshader'])
  page=await browser.new_page(viewport={'width':900,'height':1200},device_scale_factor=1)
  errors=[]
  page.on('console',lambda m: errors.append('console '+m.type+': '+m.text) if m.type=='error' else None)
  page.on('pageerror',lambda e:errors.append('pageerror: '+str(e)))
  await page.set_content(html,wait_until='load')
  await page.wait_for_timeout(1200)
  await page.screenshot(path='/mnt/data/AeroLab25/rb21-preview-iso.png',full_page=True)
  await page.locator('#viewSide').click();await page.wait_for_timeout(500)
  await page.screenshot(path='/mnt/data/AeroLab25/rb21-preview-side.png',full_page=True)
  print('canvas:',await page.locator('#gl').evaluate('(e)=>[e.width,e.height,!!e.getContext("webgl")]'))
  print('errors:',errors)
  await browser.close()
asyncio.run(main())
