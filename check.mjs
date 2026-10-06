import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createEngine} from './dist/engine.mjs';
const data=JSON.parse(fs.readFileSync(new URL('./dist/data.json',import.meta.url)));
const engine=createEngine(data);
assert.equal(data.students.length,1199);
assert.equal(engine.groups.size,221);
assert.equal(new Set([...engine.groups.values()].map(g=>g.code)).size,96);
assert.equal(data.students.reduce((n,s)=>n+s.meetings.length,0),12838);
const weekly=engine.freeSlots(' 20p-0104 ');
assert.equal(weekly.student.roll,'20P-0104');
assert.equal(weekly.days.length,5);
const timetable=engine.studentTimetable(' 20p-0104 ');
assert.equal(timetable.student.roll,'20P-0104');
assert.equal(timetable.days.length,5);
assert.equal(timetable.days.reduce((n,day)=>n+day.meetings.length,0),weekly.student.meetings.length);
for(const {day,meetings} of timetable.days){
 let previousStart=-Infinity;
 for(const meeting of meetings){
  assert.equal(meeting.day,day);
  assert.ok(meeting.start>=previousStart);
  previousStart=meeting.start;
 }
}
for(const {day,slots} of weekly.days){
 let previousEnd=Math.min(...data.starts);
 for(const slot of slots){
  assert.ok(slot.start>=previousEnd&&slot.end<=data.dayEnd&&slot.start<slot.end);
  assert.ok(!weekly.student.meetings.map(id=>engine.meetingMap.get(id)).some(m=>m.day===day&&m.start<slot.end&&m.end>slot.start));
  previousEnd=slot.end;
 }
}
assert.throws(()=>engine.freeSlots('not-a-roll-number'),/No timetable found/);
assert.throws(()=>engine.studentTimetable('not-a-roll-number'),/No timetable found/);
// An independent set-based occupancy calculation checks every candidate
// for every section against all individual student schedules.
let compared=0;
for(const g of engine.groups.values()){
 for(const duration of [30,80,160]){
  const actual=engine.check({code:g.code,section:g.section,duration});
  for(const c of actual.cells){
   const busy=new Set();
   for(const s of g.students){
    for(const id of s.meetings){
     const m=data.meetings[id];
     const intersection=Math.min(c.end,m.end)-Math.max(c.start,m.start);
     if(m.day===c.day&&intersection>0)busy.add(s.roll);
    }
   }
   assert.deepEqual(c.conflicts.map(s=>s.roll),[...busy]);
   assert.equal(c.status,c.end>1050?'outside':busy.size?'busy':'free');compared++;
  }
 }
}
// Focused regression: releasing a moved meeting must keep other courses
// at that same time, and touching endpoints do not create a clash.
const fixture={days:data.days,starts:[480,560,570,1020],dayEnd:1050,
 students:[{roll:'A',meetings:[0,1,2]},{roll:'B',meetings:[0,2]}],
 meetings:[{id:0,code:'X',section:'S',title:'X',day:0,start:480,end:560},
 {id:1,code:'Y',section:'S',title:'Y',day:0,start:480,end:560},
 {id:2,code:'X',section:'S',title:'X',day:1,start:480,end:560}]};
const test=createEngine(fixture);
const moved=test.check({code:'X',section:'S',duration:80,mode:'move',moveId:0});
assert.equal(moved.cells.find(c=>c.day===0&&c.start===480).conflicts.length,1);
assert.equal(moved.cells.find(c=>c.day===1&&c.start===480).conflicts.length,2);
assert.equal(moved.cells.find(c=>c.day===0&&c.start===560).conflicts.length,0);
assert.equal(moved.cells.find(c=>c.start===1020).status,'outside');
assert.throws(()=>test.check({code:'X',section:'S',mode:'move',moveId:1}));
assert.deepEqual(test.freeSlots('a').days.map(d=>d.slots),[
 [{start:560,end:1050}],
 [{start:560,end:1050}],
 [{start:480,end:1050}],
 [{start:480,end:1050}],
 [{start:480,end:1050}]
]);
const ai=engine.check({code:'AI3002',section:'BAI-5A',duration:80});
console.log(JSON.stringify({verifiedCandidateChecks:compared,allStudentEntries:12838,BAI5AMachineLearning:{students:ai.group.students.length,free:ai.cells.filter(c=>c.status==='free').map(c=>({day:data.days[c.day],start:c.start,end:c.end}))}},null,2));
// Check local asset references and required interface controls.
const html=fs.readFileSync(new URL('./dist/index.html',import.meta.url),'utf8');
for(const asset of ['styles.css','app.js','engine.mjs','data.json'])assert.ok(fs.existsSync(new URL('./dist/'+asset,import.meta.url)));
for(const id of ['planner','course','section','session','duration','availability','slot-detail','roster','student-menu','student-lookup','student-roll','student-results','student-days','student-timetable-menu','timetable-lookup','timetable-roll','timetable-results','timetable-days'])assert.ok(html.includes(`id="${id}"`));
