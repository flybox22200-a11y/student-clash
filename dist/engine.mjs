export function createEngine(data){
 const meetingMap=new Map(data.meetings.map(m=>[m.id,m]));
 const groups=new Map();
 for(const student of data.students){
  const seen=new Set();
  for(const id of student.meetings){
   const m=meetingMap.get(id);if(!m)throw Error('Unknown scheduled meeting');
   const key=m.code+'|'+m.section;
   if(!groups.has(key))groups.set(key,{key,code:m.code,title:m.title,section:m.section,students:[],meetings:[]});
   const group=groups.get(key);
   if(!seen.has(key)){group.students.push(student);seen.add(key);}
   if(!group.meetings.includes(id))group.meetings.push(id);
  }
 }
 for(const g of groups.values()){
  g.students.sort((a,b)=>a.roll.localeCompare(b.roll));
  g.meetings.sort((a,b)=>{a=meetingMap.get(a);b=meetingMap.get(b);return a.day-b.day||a.start-b.start;});
 }
 function findStudent(roll){
  if(typeof roll!=='string'||!roll.trim())throw Error('Enter a student roll number.');
  const student=data.students.find(s=>s.roll.toUpperCase()===roll.trim().toUpperCase());
  if(!student)throw Error(`No timetable found for roll number "${roll.trim()}". Check the roll number and try again.`);
  return student;
 }
 function freeSlots(roll){
  const student=findStudent(roll);
  const dayStart=Math.min(...data.starts);
  const days=data.days.map((name,day)=>{
   const meetings=student.meetings.map(id=>meetingMap.get(id))
    .filter(m=>m.day===day&&m.end>dayStart&&m.start<data.dayEnd)
    .map(m=>({start:Math.max(m.start,dayStart),end:Math.min(m.end,data.dayEnd)}))
    .sort((a,b)=>a.start-b.start||a.end-b.end);
   const occupied=[];
   for(const meeting of meetings){
    const previous=occupied[occupied.length-1];
    if(previous&&meeting.start<=previous.end)previous.end=Math.max(previous.end,meeting.end);
    else occupied.push({...meeting});
   }
   const slots=[];let cursor=dayStart;
   for(const meeting of occupied){
    if(meeting.start>cursor)slots.push({start:cursor,end:meeting.start});
    cursor=Math.max(cursor,meeting.end);
   }
   if(cursor<data.dayEnd)slots.push({start:cursor,end:data.dayEnd});
   return {day,name,slots};
  });
  return {student,days};
 }
 function studentTimetable(roll){
  const student=findStudent(roll);
  const days=data.days.map((name,day)=>{
   const meetings=student.meetings.map(id=>meetingMap.get(id))
    .filter(meeting=>meeting.day===day)
    .sort((a,b)=>a.start-b.start||a.end-b.end);
   return {day,name,meetings};
  });
  return {student,days};
 }
 function check({code,section,duration=80,mode='extra',moveId=null}){
  const group=groups.get(code+'|'+section);
  if(!group)throw Error('Choose a valid course and section.');
  if(!Number.isInteger(duration)||duration<1||duration>570)throw Error('Choose a valid class duration.');
  if(!['extra','move'].includes(mode))throw Error('Choose an additional class or move an existing class.');
  const moved=mode==='move'?meetingMap.get(moveId):null;
  if(mode==='move'&&(!moved||!group.meetings.includes(moveId)))throw Error('Choose the class to move.');
  const cells=[];
  for(let day=0;day<5;day++)for(const start of data.starts){
   const end=start+duration;const conflicts=[];
   for(const student of group.students){
    const clashes=student.meetings.map(id=>meetingMap.get(id)).filter(m=>{
     // Release exactly the selected meeting, retaining the other weekly
     // meeting and every other course, including simultaneous clashes.
     if(moved&&m.code===moved.code&&m.section===moved.section&&m.day===moved.day&&m.start===moved.start&&m.end===moved.end)return false;
     return m.day===day&&m.start<end&&m.end>start;
    });
    if(clashes.length)conflicts.push({roll:student.roll,page:student.page,meetings:clashes});
   }
   const outside=end>data.dayEnd;
   const current=!!moved&&day===moved.day&&start===moved.start&&end===moved.end;
   const status=outside?'outside':conflicts.length?'busy':current?'current':'free';
   cells.push({day,start,end,status,current,conflicts,freeStudents:group.students.length-conflicts.length});
  }
  return {group,mode,duration,moved,cells};
 }
 return {data,meetingMap,groups,check,freeSlots,studentTimetable};
}
