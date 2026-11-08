import {test,expect} from '@playwright/test';
test('client-only unverified statistics, breakdown filters and synchronized trade markers',async({page})=>{
  await page.setViewportSize({width:1440,height:1200});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const now=Math.floor(Date.now()/60000)*60;
  const trades=Array.from({length:40},(_,i)=>({
    id:i,symbol:'GOLD XAU/USD',openedAt:new Date((now-i*60)*1000).toISOString(),dir:i%2?'buy':'sell',
    entryType:i<30?'BT 0.382':'FTB 0.382',exec:i%2?'VHB + Engulf Trigger':'VLB + Engulf Trigger',bias:i<30?'Continuation':'Reversal',sess:'new-york',hour:i<30?14:10,
    status:i<20?'Full TP':i<30?'Break Even':i<38?'Stop Loss':'',outcome:i<20?'win':i<30?'be':i<38?'loss':'unknown',
    pnl:i<20?20:i<30?0:i<38?-10:null,realR:i<20?2:i<30?0:i<38?-1:null,plannedR:7,entry:2300,notes:'Fixture only'
  }));
  await page.goto('/dashboard');await expect(page.getByText('Upload journal to unlock brain')).toBeVisible();
  await page.locator('.journal-view input[type=file]').setInputFiles({name:'synthetic-fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({trades:JSON.stringify(trades)}))});
  const brain=page.getByLabel('Brain Learning Status');await expect(brain).toContainText('40 trades analyzed');
  await expect(brain).toContainText('320.00');await expect(brain).toContainText('32.00 R');await expect(brain).toContainText('50.0%');await expect(brain).toContainText('Full TP 20/40');await expect(brain).toContainText('71.4%');await expect(brain).toContainText('Unknown outcome: 2');await expect(brain).toContainText('8.42 P/L per trade');
  await expect(brain.getByLabel('By setup',{exact:true})).toContainText('BT 0.382');await expect(brain.getByLabel('By execution',{exact:true})).toContainText('VLB + Engulf Trigger');await expect(brain.getByLabel('By bias',{exact:true})).toContainText('Reversal');await expect(brain.getByLabel('By session / hour',{exact:true})).toContainText('new-york · 14:00');
  const vlb=brain.getByRole('button',{name:'Filter By execution VLB + Engulf Trigger'}); await vlb.focus(); await expect(brain.getByRole('tooltip')).toContainText('Visual Low Break FOR SELLS');
  const vhb=brain.getByRole('button',{name:'Filter By execution VHB + Engulf Trigger'}); await vhb.hover(); await expect(brain.getByRole('tooltip')).toContainText('Visual High Break FOR BUYS');
  await vlb.click();await expect(page.getByText('20 matching')).toBeVisible();
  await brain.getByRole('button',{name:'Filter By bias Reversal'}).click();await expect(page.getByText('10 matching')).toBeVisible();
  await brain.getByRole('button',{name:'Filter By session / hour new-york · 14:00'}).click();await expect(page.getByText('30 matching')).toBeVisible();
  await brain.getByRole('button',{name:'Filter By setup BT 0.382'}).click();await expect(page.getByText('30 matching')).toBeVisible();
  await page.getByRole('link',{name:'Chart workspace'}).click();await expect(page).toHaveURL(/\/chart$/);
  await page.getByRole('button',{name:'Skip - Use Demo'}).click();await expect(page.getByRole('status')).toContainText('Using demo feed');
  await expect(page.getByText(/30 filtered journal records/)).toBeVisible();
  await expect(page.getByLabel('M1 trade markers')).toContainText('30 trade markers');await expect(page.getByLabel('M5 trade markers')).toContainText('30 trade markers');
  // Locate an actual rendered buy triangle by its marker color, then exercise its hover tooltip.
  const box = await page.getByLabel('M1 chart').locator('.chart-host').boundingBox();
  expect(box).not.toBeNull();
  const image = (await page.screenshot()).toString('base64');
  const point = await page.evaluate(async ({image,box}) => {
    const img = new Image(); img.src=`data:image/png;base64,${image}`; await img.decode();
    const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;
    const ctx=canvas.getContext('2d')!;ctx.drawImage(img,0,0);const pixels=ctx.getImageData(0,0,img.width,img.height).data;
    let first: {x:number;y:number}|null=null;
    for(let y=Math.ceil(box.y);y<Math.min(img.height,box.y+box.height-40)&&!first;y++) for(let x=Math.ceil(box.x);x<Math.min(img.width,box.x+box.width-70);x++) {const i=(y*img.width+x)*4;if(pixels[i]===53&&pixels[i+1]===221&&pixels[i+2]===177){first={x,y};break;}}
    if (!first) return null;
    const pts=[];for(let y=Math.max(0,first.y-12);y<Math.min(img.height,first.y+14);y++)for(let x=Math.max(0,first.x-12);x<Math.min(img.width,first.x+14);x++){const i=(y*img.width+x)*4;if(pixels[i]===53&&pixels[i+1]===221&&pixels[i+2]===177)pts.push({x,y});}
    return {x:pts.reduce((sum,p)=>sum+p.x,0)/pts.length,y:pts.reduce((sum,p)=>sum+p.y,0)/pts.length};
  },{image,box:box!});
  expect(point).not.toBeNull(); await page.mouse.move(point!.x,point!.y);
  await expect(page.getByRole('tooltip').first()).toContainText('BT 0.382');
  await page.getByLabel('M1 trade markers').click();await expect(page.locator('.marker-list[open]')).toContainText('BT 0.382 | P/L');await expect(page.locator('.marker-list[open]')).toContainText('2.00R | Full TP');
  await page.getByRole('button',{name:'Show My Trades on'}).click();await expect(page.getByLabel('M1 trade markers')).toContainText('0 trade markers');await expect(page.getByLabel('M5 trade markers')).toContainText('0 trade markers');
  await page.getByRole('button',{name:'Show My Trades off'}).click();await expect(page.getByLabel('M1 trade markers')).toContainText('30 trade markers');
  await page.getByRole('button',{name:'Clear filters'}).click();await expect(page.getByText(/40 filtered journal records/)).toBeVisible();await expect(page.getByLabel('M1 trade markers')).toContainText('40 trade markers');
  expect(errors).toEqual([]);
});
