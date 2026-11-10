import test from 'node:test';
import assert from 'node:assert/strict';
import * as d from '../src/domain.js';

const fixture = () => ({clubs:[{id:'c',name:'농구',sport:'농구'}],students:[{id:'a',clubId:'c',alias:'가람'},{id:'b',clubId:'c',alias:'나래'},{id:'z',clubId:'c',alias:'다온'}],sessions:[{id:'s',clubId:'c',title:'훈련',date:'2026-11-03',participantIds:['a','b','z']}],attendance:[],journals:[],feedback:[],settings:{schemaVersion:1,ruleVersion:1}});
test('참여와 완료 일지를 합산하고 수정·결석 전환을 반영한다',()=>{
 const x=fixture();x.attendance=[{id:'t',sessionId:'s',studentId:'a',status:'present'}];x.journals=[{id:'j',sessionId:'s',studentId:'a',state:'completed',activity:'패스 연습했어요',learning:'시선이 중요해요',nextGoal:'정확하게 패스하기'}];
 assert.equal(d.ranking(x,'c')[0].points,20);x.journals[0].learning='자세를 배웠어요';assert.equal(d.ranking(x,'c')[0].points,20);x.attendance[0].status='absent';assert.equal(d.ranking(x,'c')[0].points,0);
});
test('공동순위는 1·1·3이고 다른 클럽은 제외한다',()=>{
 const x=fixture(); x.attendance=['a','b'].map(studentId=>({id:studentId,sessionId:'s',studentId,status:'present'}));x.students.push({id:'other',clubId:'other',alias:'타인'});
 assert.deepEqual(d.ranking(x,'c').map(x=>[x.points,x.rank]),[[10,1],[10,1],[0,3]]);
});
test('금주 범위는 월요일 시작이며 날짜 경계 밖 점수는 제외한다',()=>{
 const x=fixture();x.attendance=[{id:'t',sessionId:'s',studentId:'a',status:'present'}];assert.equal(d.ranking(x,'c','week','2026-11-09')[0].points,0);assert.equal(d.ranking(x,'c','week','2026-11-08')[0].points,10);
});
test('미완료 일지에 점수를 주지 않고 완료시 3문항을 검증한다',()=>{
 const x=fixture();x.attendance=[{id:'t',sessionId:'s',studentId:'a',status:'late'}];x.journals=[{id:'j',sessionId:'s',studentId:'a',state:'draft',activity:'',learning:'',nextGoal:''}];assert.equal(d.ranking(x,'c')[0].points,10);
 assert.throws(()=>d.command(x,'journal',{sessionId:'s',studentId:'a',state:'completed',activity:'a',learning:'',nextGoal:''}),/5자/);
});
test('학생 삭제는 회차 명단과 종속 기록까지 정리한다',()=>{
 const x=fixture();x.attendance=[{id:'t',sessionId:'s',studentId:'a',status:'present'}];x.journals=[{id:'j',sessionId:'s',studentId:'a',state:'draft'}];x.feedback=[{id:'f',journalId:'j',text:'좋아요'}];const y=d.command(x,'deleteStudent',{id:'a'});
 assert.equal(y.students.length,2);assert.equal(y.journals.length,0);assert.equal(y.feedback.length,0);assert.equal(y.attendance.length,0);assert.deepEqual(y.sessions[0].participantIds,['b','z']);assert.equal(x.students.length,3);
});
test('회차 명단 밖 학생 기록과 미래 출석은 저장하지 않는다',()=>{
 const x=fixture();x.sessions[0].participantIds=['b'];assert.throws(()=>d.command(x,'attendance',{sessionId:'s',changes:{a:'present'}},'2026-11-04'),/명단/);x.sessions[0].date='2026-11-05';assert.throws(()=>d.command(x,'attendance',{sessionId:'s',changes:{b:'present'}},'2026-11-04'),/미래/);
});
test('백업 왕복은 원본을 복구하고 잘못된 버전·관계·중복을 거부한다',()=>{
 const x=fixture();const b=d.backup(x);assert.deepEqual(d.parseBackup(JSON.stringify(b)),x);
 b.schemaVersion=99;assert.throws(()=>d.parseBackup(JSON.stringify(b)),/버전/);b.schemaVersion=1;b.data.students.push({...b.data.students[0]});assert.throws(()=>d.parseBackup(JSON.stringify(b)),/중복/);
 const bad=d.backup(fixture());bad.data.attendance=[{id:'t',sessionId:'s',studentId:'unknown',status:'present'}];assert.throws(()=>d.parseBackup(JSON.stringify(bad)),/명단|관계/);
});
test('존재하지 않는 날짜와 유효하지 않은 완료 일지 백업을 거부한다',()=>{
 const b=d.backup(fixture());b.data.sessions[0].date='2026-02-30';assert.throws(()=>d.parseBackup(JSON.stringify(b)),/날짜/);
 const c=d.backup(fixture());c.data.journals=[{id:'j',sessionId:'s',studentId:'a',state:'completed',activity:'',learning:'',nextGoal:''}];assert.throws(()=>d.parseBackup(JSON.stringify(c)),/5자/);
});
test('일괄 출석 재저장은 기록을 중복 생성하지 않는다',()=>{
 let x=fixture();x=d.command(x,'attendance',{sessionId:'s',changes:{a:'present',b:'late'}},'2026-11-04');x=d.command(x,'attendance',{sessionId:'s',changes:{a:'present'}},'2026-11-04');assert.equal(x.attendance.length,2);assert.equal(d.ranking(x,'c')[0].points,10);
});
test('데모는 유효하며 초기 날짜 이후 출석이 없다',()=>{const x=d.demo('2026-11-04');assert.deepEqual(d.parseBackup(JSON.stringify(d.backup(x))),x);assert.equal(x.students.length,28);assert.ok(x.sessions.every(s=>s.date<='2026-11-04'));});
test('기존 학생의 선택 학적정보를 빈 값으로 지울 수 있다',()=>{const x=fixture();Object.assign(x.students[0],{grade:1,classNumber:1,studentNumber:1});const y=d.command(x,'student',{id:'a',clubId:'c',alias:'가람',grade:'',classNumber:'',studentNumber:''});assert.equal(y.students[0].grade,null);assert.equal(y.students[0].classNumber,null);assert.equal(y.students[0].studentNumber,null);});
test('확정 기록이 있는 회차를 미래 날짜로 변경하지 못한다',()=>{const x=fixture();x.attendance=[{id:'t',sessionId:'s',studentId:'a',status:'present'}];assert.throws(()=>d.command(x,'session',{id:'s',clubId:'c',title:'훈련',date:'2026-11-10'},'2026-11-04'),/미래/);});
