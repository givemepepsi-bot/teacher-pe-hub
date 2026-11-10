import {test,expect} from '@playwright/test';
const cloudModule=`import {demo,empty} from './domain.js'; export const cloudConfigured=true;let cb;export async function observeIdentity(fn){cb=fn;fn({uid:'teacher-a'});}export async function loginGoogle(){}export async function logoutGoogle(){cb(null);}export async function readCloud(){const data=demo();data.students[0].alias='PRIVATE-ONLY';return {data,revision:1};}export async function writeCloud(data,revision){return {data,revision:revision+1};}export async function deleteCloud(){await new Promise(()=>{});}export function cloudError(e){return e.message;}`;
const localModule=`import {demo} from './domain.js';const initial={revision:1,data:demo()};export async function openStore(){return initial;}export async function load(){await new Promise(()=>{});}export async function save(){throw Error('Unexpected local write');}export function onExternalChange(){}`;
for(const action of ['로컬 체험으로','로그아웃'])test(`${action}: 로컬 저장소 응답이 늦어도 비공개 기록은 즉시 화면에서 지운다`,async({page})=>{
 await page.route('**/src/cloud.js',route=>route.fulfill({contentType:'text/javascript',body:cloudModule}));await page.route('**/src/storage.js',route=>route.fulfill({contentType:'text/javascript',body:localModule}));
 await page.goto('./#/sports/students');await page.getByRole('button',{name:'내 클라우드 열기'}).click();await expect(page.locator('main')).toContainText('PRIVATE-ONLY');await page.getByRole('button',{name:action,exact:true}).click();await expect(page.locator('body')).not.toContainText('PRIVATE-ONLY');
});
test('클라우드 삭제 요청이 끝날 때까지 다른 편집과 저장을 잠근다',async({page})=>{
 await page.route('**/src/cloud.js',route=>route.fulfill({contentType:'text/javascript',body:cloudModule}));await page.goto('./#/sports');await page.getByRole('button',{name:'내 클라우드 열기'}).click();page.on('dialog',d=>d.accept());await page.getByRole('button',{name:'클라우드 기록 삭제'}).click();await expect(page.locator('#app')).toHaveAttribute('inert','');
});
