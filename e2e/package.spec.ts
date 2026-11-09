import {test,expect} from '@playwright/test';

test('dashboard links to the empty Download Center and retains system export',async({page})=>{
  await page.goto('/dashboard');
  await expect(page.getByRole('button',{name:'Download legacy EA Package (ZIP)'})).toHaveCount(0);
  await expect(page.getByRole('link',{name:'Open Download Center'})).toHaveAttribute('href','/ea');
  await expect(page.getByLabel('Generated system text')).toBeVisible();
});
