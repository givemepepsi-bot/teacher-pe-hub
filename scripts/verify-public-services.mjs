import assert from 'node:assert/strict';
import {firebaseConfig as config} from '../src/firebase-config.js';
const r=await fetch(`https://identitytoolkit.googleapis.com/v1/projects?key=${config.apiKey}`);
const c=await r.json();assert.equal(r.status,200,JSON.stringify(c));assert.ok(c.authorizedDomains?.includes('givemepepsi-bot.github.io'),'Pages 도메인이 승인되지 않았습니다.');
const auth=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${config.apiKey}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({providerId:'google.com',continueUri:'https://givemepepsi-bot.github.io/teacher-pe-hub/'})});
const a=await auth.json();assert.equal(auth.status,200,JSON.stringify(a));assert.ok(a.authUri?.startsWith('https://accounts.google.com/'),'Google provider 로그인 주소가 없습니다.');
const denied=await fetch(`https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents/teacherWorkspaces/anonymous-probe`);assert.equal(denied.status,403,'비로그인 원본 조회가 차단되지 않았습니다.');
const list=await fetch(`https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents/teacherWorkspaces`);assert.equal(list.status,403,'비로그인 목록 조회가 차단되지 않았습니다.');
for(const file of ['firebase-app.js','firebase-auth.js','firebase-firestore.js']){const sdk=await fetch(`https://www.gstatic.com/firebasejs/13.2.0/${file}`,{method:'HEAD'});assert.equal(sdk.status,200,`${file} 로딩 실패`);}
console.log(JSON.stringify({googleProvider:'enabled',pagesDomain:'authorized',unauthenticatedRead:'denied',unauthenticatedList:'denied',sdk:'available'}));
