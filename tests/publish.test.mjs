import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
test('공개 빌드는 앱 파일만 포함하고 서브경로용 상대 URL을 사용한다',async()=>{
 const out=await mkdtemp(path.join(os.tmpdir(),'pe-hub-build-'));
 try{const result=spawnSync(process.execPath,['scripts/build.mjs',out],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);const files=await readdir(out);assert.deepEqual(files.sort(),['.nojekyll','index.html','privacy.html','src']);const html=await readFile(path.join(out,'index.html'),'utf8');assert.ok(html.includes('./src/app.js'));assert.ok(!html.includes('href="/src/'));const sourceFiles=await readdir(path.join(out,'src'));assert.ok(!sourceFiles.some(f=>/\.env|secret|credential|\.log/.test(f)));}finally{await rm(out,{recursive:true,force:true});}
});
