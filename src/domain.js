export const statuses = {unknown:'미확인',present:'출석',late:'지각',absent:'결석',excused:'인정불참'};
export const uid = () => crypto.randomUUID();
export function today() { const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
export function dateShift(date,days){const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+days);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function empty(){return {clubs:[],students:[],sessions:[],attendance:[],journals:[],feedback:[],settings:{schemaVersion:1,ruleVersion:1}};}
function text(v,min,max,label){if(typeof v!=='string'||v.trim().length<min||v.length>max)throw Error(`${label}: 최소 ${min}자, 최대 ${max}자로 입력해 주세요.`);return v.trim();}
function dateValid(v){return typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!isNaN(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;}
function journalValid(j){for(const [k,label] of [['activity','훈련 내용'],['learning','배운 점'],['nextGoal','다음 목표']])text(j[k]??'',j.state==='completed'?5:0,500,label);if(!['draft','completed'].includes(j.state))throw Error('일지 상태 오류');if(j.effort!=null&&(!Number.isInteger(j.effort)||j.effort<1||j.effort>5))throw Error('난도는 1~5 사이입니다.');}
export function ranking(data,clubId,range='all',now=today()){
 const weekday=new Date(now+'T12:00:00').getDay();const start=dateShift(now,-((weekday+6)%7)),end=dateShift(start,6);
 const sessions=data.sessions.filter(s=>s.clubId===clubId&&(range!=='week'||(s.date>=start&&s.date<=end)));
 const allSessions=data.sessions.filter(s=>s.clubId===clubId);
 function stats(studentId,list){let points=0,participations=0,completed=0;for(const s of list){const a=data.attendance.find(a=>a.sessionId===s.id&&a.studentId===studentId);if(!['present','late'].includes(a?.status))continue;points+=10;participations++;if(data.journals.some(j=>j.sessionId===s.id&&j.studentId===studentId&&j.state==='completed')){points+=10;completed++;}}return {points,participations,completed};}
 const rows=data.students.filter(s=>s.clubId===clubId).map(student=>{const total=stats(student.id,allSessions),current=stats(student.id,sessions);return {...student,...current,totalPoints:total.points,level:Math.floor(total.points/100)+1,badges:[total.completed>=1&&'첫 기록',total.completed>=5&&'기록 습관',total.completed>=10&&'꾸준한 도전자'].filter(Boolean)};}).sort((a,b)=>b.points-a.points||a.alias.localeCompare(b.alias,'ko')||a.id.localeCompare(b.id));
 let rank=0;return rows.map((r,i)=>{if(i===0||r.points!==rows[i-1].points)rank=i+1;return {...r,rank};});
}
function roster(data,sessionId,studentId,now){const s=data.sessions.find(s=>s.id===sessionId);if(!s||!s.participantIds.includes(studentId))throw Error('해당 회차 명단에 없는 학생입니다.');if(now&&s.date>now)throw Error('미래 회차에는 기록을 확정할 수 없습니다.');return s;}
export function command(original,type,p={},now=today()){
 const x=structuredClone(original),stamp=new Date().toISOString();
 const upsert=(key,match,value)=>{const i=x[key].findIndex(match);if(i<0)x[key].push({id:uid(),createdAt:stamp,...value,updatedAt:stamp});else x[key][i]={...x[key][i],...value,updatedAt:stamp};};
 const removeJournals=predicate=>{const removed=x.journals.filter(predicate).map(j=>j.id);x.feedback=x.feedback.filter(f=>!removed.includes(f.journalId));x.journals=x.journals.filter(j=>!predicate(j));};
 if(type==='club'){const name=text(p.name,1,40,'클럽명'),sport=text(p.sport,1,30,'종목');upsert('clubs',c=>c.id===p.id,{...(p.id?{id:p.id}:{}),name,sport});}
 else if(type==='student'){
  if(!x.clubs.some(c=>c.id===p.clubId))throw Error('클럽을 먼저 선택해 주세요.');
  const row={clubId:p.clubId,alias:text(p.alias,1,20,'별칭')};for(const [k,max] of [['grade',3],['classNumber',99],['studentNumber',99]]){row[k]=null;if(p[k]!==''&&p[k]!=null){const n=Number(p[k]);if(!Number.isInteger(n)||n<1||n>max)throw Error('학년·반·번호 범위를 확인해 주세요.');row[k]=n;}}
  upsert('students',s=>s.id===p.id,{...(p.id?{id:p.id}:{}),...row});
 }else if(type==='archive'){const s=x.students.find(s=>s.id===p.id);if(!s)throw Error('학생이 없습니다.');s.archivedAt=s.archivedAt?null:stamp;}
 else if(type==='session'){
  if(!dateValid(p.date))throw Error('날짜를 확인해 주세요.');if(!x.clubs.some(c=>c.id===p.clubId))throw Error('클럽이 없습니다.');
  const existing=x.sessions.find(s=>s.id===p.id);if(existing&&p.date>now&&(x.attendance.some(a=>a.sessionId===p.id&&a.status!=='unknown')||x.journals.some(j=>j.sessionId===p.id&&j.state==='completed')))throw Error('확정 기록이 있는 회차를 미래 날짜로 변경할 수 없습니다. 새 회차를 만들어 주세요.');upsert('sessions',s=>s.id===p.id,{...(p.id?{id:p.id}:{}),clubId:p.clubId,title:text(p.title,1,60,'회차 제목'),date:p.date,note:text(p.note??'',0,300,'메모'),participantIds:existing?.participantIds??x.students.filter(s=>s.clubId===p.clubId&&!s.archivedAt).map(s=>s.id)});
 }else if(type==='attendance'){
  for(const [studentId,status] of Object.entries(p.changes)){roster(x,p.sessionId,studentId,now);if(!(status in statuses))throw Error('출석 상태 오류');upsert('attendance',a=>a.sessionId===p.sessionId&&a.studentId===studentId,{sessionId:p.sessionId,studentId,status});}
 }else if(type==='journal'){
  roster(x,p.sessionId,p.studentId,p.state==='completed'?now:null);journalValid(p);upsert('journals',j=>j.sessionId===p.sessionId&&j.studentId===p.studentId,{sessionId:p.sessionId,studentId:p.studentId,activity:(p.activity??'').trim(),learning:(p.learning??'').trim(),nextGoal:(p.nextGoal??'').trim(),effort:p.effort?Number(p.effort):null,state:p.state,completedAt:p.state==='completed'?stamp:null});
 }else if(type==='feedback'){
  if(!x.journals.some(j=>j.id===p.journalId))throw Error('일지를 먼저 저장해 주세요.');upsert('feedback',f=>f.journalId===p.journalId,{journalId:p.journalId,text:text(p.text,1,500,'피드백')});
 }else if(type==='deleteFeedback'){x.feedback=x.feedback.filter(f=>f.journalId!==p.journalId);}
 else if(type==='deleteJournal'){removeJournals(j=>j.id===p.id);}
 else if(type==='deleteStudent'){
  removeJournals(j=>j.studentId===p.id);x.attendance=x.attendance.filter(a=>a.studentId!==p.id);x.sessions.forEach(s=>s.participantIds=s.participantIds.filter(id=>id!==p.id));x.students=x.students.filter(s=>s.id!==p.id);
 }else if(type==='deleteSession'){
  removeJournals(j=>j.sessionId===p.id);x.attendance=x.attendance.filter(a=>a.sessionId!==p.id);x.sessions=x.sessions.filter(s=>s.id!==p.id);
 }else if(type==='deleteClub'){
  const ids=x.sessions.filter(s=>s.clubId===p.id).map(s=>s.id);removeJournals(j=>ids.includes(j.sessionId));x.attendance=x.attendance.filter(a=>!ids.includes(a.sessionId));x.sessions=x.sessions.filter(s=>s.clubId!==p.id);x.students=x.students.filter(s=>s.clubId!==p.id);x.clubs=x.clubs.filter(c=>c.id!==p.id);
 }else throw Error('지원하지 않는 작업입니다.');
 return x;
}
export function backup(data){return {format:'pe-teacher-hub',schemaVersion:1,ruleVersion:1,exportedAt:new Date().toISOString(),data:structuredClone(data)};}
export function parseBackup(raw){
 if(typeof raw!=='string'||new TextEncoder().encode(raw).length>10*1024*1024)throw Error('백업 파일은 10MB 이하여야 합니다.');
 let b;try{b=JSON.parse(raw);}catch{throw Error('올바른 JSON 백업 파일이 아닙니다.');}
 if(b?.format!=='pe-teacher-hub'||b.schemaVersion!==1||b.ruleVersion!==1)throw Error('지원하지 않는 백업 형식 또는 버전입니다.');
 const x=b.data;if(!x||typeof x!=='object')throw Error('백업 데이터가 없습니다.');
 const fields={clubs:['id','name','sport','createdAt','updatedAt'],students:['id','clubId','alias','grade','classNumber','studentNumber','archivedAt','createdAt','updatedAt'],sessions:['id','clubId','title','date','note','participantIds','createdAt','updatedAt'],attendance:['id','sessionId','studentId','status','createdAt','updatedAt'],journals:['id','sessionId','studentId','activity','learning','nextGoal','effort','state','completedAt','createdAt','updatedAt'],feedback:['id','journalId','text','createdAt','updatedAt']};
 for(const k of Object.keys(x))if(![...Object.keys(fields),'settings'].includes(k))throw Error('알 수 없는 데이터 항목입니다.');
 for(const [key,allowed] of Object.entries(fields)){
  if(!Array.isArray(x[key]))throw Error(`${key} 데이터 형식 오류`);const ids=new Set();
  for(const row of x[key]){if(!row||typeof row!=='object'||Array.isArray(row))throw Error('레코드 형식 오류');text(row.id,1,100,'ID');if(ids.has(row.id))throw Error('중복 ID가 있습니다.');ids.add(row.id);if(Object.keys(row).some(k=>!allowed.includes(k)))throw Error('알 수 없는 필드입니다.');for(const k of ['createdAt','updatedAt','completedAt','archivedAt'])if(row[k]!=null&&(typeof row[k]!=='string'||isNaN(Date.parse(row[k]))))throw Error('시각 형식 오류');}
 }
 if(!x.settings||x.settings.schemaVersion!==1||x.settings.ruleVersion!==1||Object.keys(x.settings).some(k=>!['schemaVersion','ruleVersion','selectedClubId','demoSeedVersion'].includes(k)))throw Error('설정 버전 오류');
 for(const c of x.clubs){text(c.name,1,40,'클럽명');text(c.sport,1,30,'종목');}
 for(const s of x.students){text(s.alias,1,20,'별칭');if(!x.clubs.some(c=>c.id===s.clubId))throw Error('학생 클럽 관계 오류');for(const [k,max] of [['grade',3],['classNumber',99],['studentNumber',99]])if(s[k]!=null&&(!Number.isInteger(s[k])||s[k]<1||s[k]>max))throw Error('학적정보 범위 오류');}
 for(const s of x.sessions){text(s.title,1,60,'회차 제목');text(s.note??'',0,300,'메모');if(!dateValid(s.date))throw Error('회차 날짜 오류');if(!x.clubs.some(c=>c.id===s.clubId)||!Array.isArray(s.participantIds)||new Set(s.participantIds).size!==s.participantIds.length||s.participantIds.some(id=>!x.students.some(st=>st.id===id&&st.clubId===s.clubId)))throw Error('회차 명단 관계 오류');}
 for(const key of ['attendance','journals']){const pairs=new Set();for(const r of x[key]){roster(x,r.sessionId,r.studentId);const pair=JSON.stringify([r.sessionId,r.studentId]);if(pairs.has(pair))throw Error('중복 학생 회차 기록');pairs.add(pair);if(key==='attendance'){if(!Object.hasOwn(statuses,r.status))throw Error('출석 상태 오류');}else journalValid(r);}}
 const feedbackIds=new Set();for(const f of x.feedback){text(f.text,1,500,'피드백');if(!x.journals.some(j=>j.id===f.journalId)||feedbackIds.has(f.journalId))throw Error('피드백 관계 또는 중복 오류');feedbackIds.add(f.journalId);}
 return structuredClone(x);
}
export function demo(now=today()){
 let x=empty();x.settings.demoSeedVersion=1;const names=['파랑돌고래','초록치타','보라여우','노랑사자','하늘고래','민트토끼','주황수달','분홍펭귄','은빛늑대','새벽호랑이','반짝곰','푸른독수리','산들코알라','별빛판다','햇살다람쥐','달빛해달'];
 for(let c=0;c<2;c++){
  const clubId=`club-${c}`;x.clubs.push({id:clubId,name:c?'배드민턴 클럽':'농구 클럽',sport:c?'배드민턴':'농구'});
  for(let i=0;i<(c?12:16);i++)x.students.push({id:`student-${c}-${i}`,clubId,alias:names[i]+String(c+1).padStart(2,'0'),grade:i%3+1,classNumber:i%4+1,studentNumber:i+1});
  const members=x.students.filter(s=>s.clubId===clubId);
  for(let t=0;t<4;t++){
   const id=`session-${c}-${t}`,date=dateShift(now,(t-3)*3);x.sessions.push({id,clubId,title:(c?['기본 스텝과 그립','하이클리어 연습','서브 집중 훈련','복식 랠리 챌린지']:['드리블 기초 훈련','패스와 팀워크','레이업 집중 훈련','팀 플레이 챌린지'])[t],date,participantIds:members.map(s=>s.id),note:'함께 도전하고, 어제보다 한 걸음 성장하기'});
   members.forEach((s,i)=>{const status=t===3&&i>10?'unknown':i===14?'excused':(i+t)%11===0?'absent':(i+t)%7===0?'late':'present';x.attendance.push({id:`a-${id}-${i}`,sessionId:id,studentId:s.id,status});if((i+t)%4!==0&&status!=='unknown'){
    const journalId=`j-${id}-${i}`;x.journals.push({id:journalId,sessionId:id,studentId:s.id,activity:c?'하이클리어와 짝 랠리를 연습했어요.':'드리블과 팀 패스 연습을 했어요.',learning:'친구와 호흡을 맞추는 것이 중요했어요.',nextGoal:'다음에는 시선을 앞에 두고 더 정확히 해볼래요.',effort:i%5+1,state:i===9&&t===3?'draft':'completed',updatedAt:date+'T09:00:00.000Z'});if((i+t)%3===0)x.feedback.push({id:`f-${id}-${i}`,journalId,text:'끝까지 집중하는 모습이 좋았어요! 다음에는 자세를 유지하며 도전해 봅시다.',updatedAt:date+'T09:30:00.000Z'});
   }});
  }
 }return x;
}
