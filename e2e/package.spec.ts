import {test,expect} from '@playwright/test';

test('dashboard links to the replacement Pro V1 sources and retains system export',async({page})=>{
  await page.goto('/dashboard');
  await expect(page.getByRole('button',{name:'Download legacy EA Package (ZIP)'})).toHaveCount(0);
  await expect(page.getByRole('link',{name:'Open Pro V1 downloads'})).toHaveAttribute('href','/ea');
  await expect(page.getByLabel('Generated system text')).toBeVisible();
});
