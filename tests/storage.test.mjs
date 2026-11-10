import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
globalThis.BroadcastChannel=undefined;
const {openStore,load,save}=await import('../src/storage.js');
import {empty} from '../src/domain.js';
test('저장은 영속화되고 오래된 revision의 덮어쓰기는 차단된다',async()=>{const first=await openStore();assert.equal(first.data.students.length,28);const saved=await save(empty(),first.revision);assert.equal(saved.data.students.length,0);assert.equal((await load()).revision,saved.revision);await assert.rejects(save(first.data,first.revision),/다른 탭/);assert.equal((await load()).data.students.length,0);});
test('유효하지 않은 데이터 저장은 기존 기록을 보존한다',async()=>{const original=await load();const bad=empty();bad.students=[{id:'invalid',clubId:'missing',alias:'가상'}];assert.throws(()=>save(bad,original.revision),/관계/);assert.deepEqual(await load(),original);});
