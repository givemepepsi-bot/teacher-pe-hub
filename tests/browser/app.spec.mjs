import {test,expect} from '@playwright/test';
test('허브에서 기록·피드백·순위 확인하고 새로고침 후에도 유지된다',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await expect(page.getByRole('heading',{name:'선생님의 아이디어가, 수업이 되는 곳.'})).toBeVisible();
 await page.screenshot({path:'artifacts/hub-desktop.png',fullPage:true});
 await page.getByRole('link',{name:'클럽 시작하기'}).click();await expect(page.getByRole('heading',{name:'함께 쌓아가는, 오늘의 성장'})).toBeVisible();
 await page.getByRole('link',{name:'출석 체크',exact:true}).first().click();await page.locator('.attendance-row').first().getByRole('button',{name:'출석',exact:true}).click();await page.getByRole('button',{name:'출석 저장'}).click();await expect(page.getByRole('status')).toContainText('출석');
 await page.getByRole('link',{name:'훈련일지',exact:true}).click();
 await page.locator('[name=activity]').fill('패스와 드리블 연습을 했습니다.');await page.locator('[name=learning]').fill('동료와 시선을 맞추는 것이 중요해요.');await page.locator('[name=nextGoal]').fill('다음에는 정확한 패스에 도전합니다.');await page.getByRole('button',{name:'일지 완료하기'}).click();
 await expect(page.locator('[name=activity]')).toHaveValue('패스와 드리블 연습을 했습니다.');await page.locator('[name=text]').fill('꾸준히 노력하는 모습이 멋져요.');await page.getByRole('button',{name:'피드백 저장'}).click();
 await page.reload();await expect(page.locator('[name=text]')).toHaveValue('꾸준히 노력하는 모습이 멋져요.');await page.getByRole('link',{name:'성장 순위',exact:true}).click();await expect(page.locator('.ranking-row').nth(1)).toContainText('PT');await page.getByRole('button',{name:'발표 모드'}).click();await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('dialog')).not.toContainText('꾸준히 노력하는 모습');await page.getByRole('button',{name:'닫기',exact:true}).click();
 await page.screenshot({path:'artifacts/ranking-desktop.png',fullPage:true});expect(errors).toEqual([]);
});
test('피드백 저장이 편집 중인 일지를 지우지 않고 반대 순서도 보존한다',async({page})=>{
 await page.goto('/#/sports/journals');await expect(page.locator('[name=activity]')).toBeVisible();
 await page.locator('[name=activity]').fill('저장 전 일지 내용을 유지해야 합니다.');await page.locator('[name=text]').fill('피드백만 먼저 저장합니다.');await page.getByRole('button',{name:'피드백 저장'}).click();await expect(page.locator('[name=activity]')).toHaveValue('저장 전 일지 내용을 유지해야 합니다.');
 await page.locator('[name=text]').fill('저장 전 피드백 내용도 유지해야 합니다.');await page.getByRole('button',{name:'임시저장',exact:true}).click();await expect(page.locator('[name=text]')).toHaveValue('저장 전 피드백 내용도 유지해야 합니다.');
});
test('작은 화면에서 주요 페이지가 가로로 넘치지 않는다',async({page})=>{
 await page.setViewportSize({width:390,height:844});for(const route of ['','sports','sports/students','sports/sessions','sports/journals','sports/ranking','sports/settings']){await page.goto('/#/'+route);await expect(page.locator('main')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),route).toBe(true);}await page.goto('/');await page.screenshot({path:'artifacts/hub-mobile.png',fullPage:true});
});
test('화면에서 백업 다운로드·전체 초기화·복원이 왕복하고 손상된 파일은 거부된다',async({page})=>{
 await page.goto('/#/sports/settings');await expect(page.locator('.data-counts')).toContainText('28');
 const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'백업 다운로드'}).click();const file=await downloaded,path=await file.path();
 page.on('dialog',d=>d.accept());await page.getByRole('button',{name:'전체 기록 초기화'}).click();await expect(page.locator('.data-counts')).toContainText('0');
 await page.locator('#import-file').setInputFiles(path);await expect(page.locator('.data-counts')).toContainText('28');
 await page.locator('#import-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"bad":true}')});await expect(page.getByRole('status')).toContainText('버전');await expect(page.locator('.data-counts')).toContainText('28');
});
