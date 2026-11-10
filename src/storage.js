import {demo,backup,parseBackup} from './domain.js';
let db;
const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('pe-hub-updates'):null;
export async function openStore(){
 db=await new Promise((resolve,reject)=>{const r=indexedDB.open('pe-teacher-hub',1);r.onupgradeneeded=()=>r.result.createObjectStore('state');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('브라우저 저장소를 열 수 없습니다. 일반 브라우저 창에서 다시 시도해 주세요.'));r.onblocked=()=>reject(Error('다른 탭을 닫고 다시 열어 주세요.'));});
 db.onversionchange=()=>db.close();
 let state=await load();if(!state)state=await save(demo(),0);return state;
}
export function load(){return new Promise((resolve,reject)=>{const tx=db.transaction('state','readonly'),r=tx.objectStore('state').get('main');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('저장된 기록을 읽지 못했습니다.'));});}
export function save(data,expectedRevision){
 const validated=parseBackup(JSON.stringify(backup(data)));
 return new Promise((resolve,reject)=>{const tx=db.transaction('state','readwrite'),store=tx.objectStore('state'),read=store.get('main');let next,error;
 read.onsuccess=()=>{const current=read.result;if((current?.revision??0)!==expectedRevision){error=Error('다른 탭에서 기록이 변경되었습니다. 현재 입력을 복사한 뒤 새로고침하고 다시 저장해 주세요.');tx.abort();return;}next={revision:expectedRevision+1,data:validated};store.put(next,'main');};
 tx.oncomplete=()=>{channel?.postMessage(next.revision);resolve(next);};tx.onerror=()=>reject(error??Error('기록을 저장하지 못했습니다. 저장 공간과 브라우저 설정을 확인해 주세요.'));tx.onabort=()=>reject(error??Error('저장이 취소되었습니다. 기존 기록은 유지됩니다.'));
 });
}
export function onExternalChange(callback){if(channel)channel.onmessage=()=>callback();}
