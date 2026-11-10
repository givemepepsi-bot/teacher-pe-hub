import test from 'node:test';
import assert from 'node:assert/strict';
import * as c from '../src/cloud-contract.js';
import {empty} from '../src/domain.js';
test('개인 클라우드는 검증된 데이터만 직렬화하고 크기 한도를 지킨다',()=>{const state=c.encodeWorkspace(empty());assert.deepEqual(c.decodeWorkspace({payload:state.payload,revision:1,generation:'gen-a',ownerId:'user-a'},'user-a'),{data:empty(),revision:1,generation:'gen-a'});assert.throws(()=>c.encodeWorkspace({}),/형식|데이터/);assert.throws(()=>c.decodeWorkspace({payload:state.payload,revision:1,generation:'gen-a',ownerId:'other'},'user-a'),/소유/);assert.throws(()=>c.decodeWorkspace({payload:state.payload,revision:-1,generation:'gen-a',ownerId:'user-a'},'user-a'),/버전|revision/);});
test('인증 사용자 ID는 경로를 탈출할 수 없고 비로그인은 허용되지 않는다',()=>{assert.equal(c.workspacePath('user-a'),'teacherWorkspaces/user-a');for(const v of ['',null,'other/path','../path'])assert.throws(()=>c.workspacePath(v),/로그인|사용자/);});
test('삭제 후 새로 만든 문서는 같은 revision이라도 이전 기기가 덮어쓰지 못한다',()=>{assert.throws(()=>c.verifyCloudVersion({revision:1,generation:'new'},1,'old'),/다른 기기|변경/);assert.doesNotThrow(()=>c.verifyCloudVersion({revision:1,generation:'new'},1,'new'));assert.throws(()=>c.verifyCloudVersion(null,1,'old'),/다른 기기|변경/);assert.doesNotThrow(()=>c.verifyCloudVersion(null,0,null));});
