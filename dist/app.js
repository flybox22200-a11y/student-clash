import {createEngine} from './engine.mjs';
function $(id) {
    return document.getElementById(id);
}

function esc(s) {
  var replacements = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
  return String(s).replace(/[&<>"']/g, function(c) { return replacements[c]; });
}

function clock(n){
  var hours = Math.floor(n/60)%12;
  if (!hours) hours = 12;
  var minutes = String(n%60).padStart(2,'0');
  var ampm = n >= 720 ? 'PM' : 'AM';
  return `${hours}:${minutes} ${ampm}`;
}

function range(start,end) {
    let startText = clock(start);
    let endText = clock(end);
    return `${startText} – ${endText}`;
}
let engine,result,selectedSlot;
function fail(message){$('error').textContent=message;$('error').hidden=false;}
function mode(){return document.querySelector('input[name="mode"]:checked').value;}
function group(){return engine.groups.get($('course').value+'|'+$('section').value);}
function stale(){if(result)$('stale').hidden=false;}
function showView(view){
 const student=view==='student';
 const timetable=view==='timetable';
 $('faculty-view').hidden=student;
 $('student-view').hidden=!student;
 $('student-timetable-view').hidden=!timetable;
 $('planner-menu').classList.toggle('active',!student&&!timetable);$('student-menu').classList.toggle('active',student);$('student-timetable-menu').classList.toggle('active',timetable);
 $('planner-menu').removeAttribute('aria-current');$('student-menu').removeAttribute('aria-current');$('student-timetable-menu').removeAttribute('aria-current');
 if(student){
  $('student-menu').setAttribute('aria-current','page');
  $('page-eyebrow').textContent='STUDENT TIMETABLE';$('page-title').textContent='Find your free time this week.';
  $('page-description').textContent='See your available periods around your scheduled classes.';
 }else if(timetable){
  $('student-timetable-menu').setAttribute('aria-current','page');
  $('page-eyebrow').textContent='STUDENT TIMETABLE';$('page-title').textContent='View your classes this week.';
  $('page-description').textContent='Enter your roll number to see your scheduled classes from Monday to Friday.';
 }else{
  $('planner-menu').setAttribute('aria-current','page');
  $('page-eyebrow').textContent='CLASS SCHEDULING';$('page-title').textContent='A time that works for everyone.';
  $('page-description').textContent="Select your course and section to check every student's timetable.";
 }
}
function lookupStudent(event){
 event.preventDefault();$('student-error').hidden=true;
 try{
  var lookup = engine.freeSlots($('student-roll').value);
  var student = lookup.student;
  var days = lookup.days;
  var count = 0;
  for (let day of days) {
    count = count + day.slots.length;
  }
  $('student-result-roll').textContent=student.roll;
  $('student-free-count').textContent=`${count} free ${count===1?'period':'periods'} this week`;
  const container=$('student-days');container.replaceChildren();
  for(const day of days){
   const card=document.createElement('section');card.className='student-day';
   const heading=document.createElement('h3');heading.textContent=day.name;card.append(heading);
   if(day.slots.length){
    const list=document.createElement('ul');list.className='free-periods';
    for(const slot of day.slots){
     const item=document.createElement('li');item.textContent=range(slot.start,slot.end);list.append(item);
    }
    card.append(list);
   }else{
    const message=document.createElement('p');message.className='no-free-periods';message.textContent='No free periods';card.append(message);
   }
   container.append(card);
  }
  $('student-results').hidden=false;
 }catch(error){
  $('student-results').hidden=true;$('student-error').textContent=error.message;$('student-error').hidden=false;
 }
}
function lookupTimetable(event){
 event.preventDefault();$('timetable-error').hidden=true;
 try{
  const {student,days}=engine.studentTimetable($('timetable-roll').value);
  $('timetable-result-roll').textContent=student.roll;
  const count=days.reduce((total,day)=>total+day.meetings.length,0);
  $('timetable-class-count').textContent=`${count} scheduled ${count===1?'class':'classes'} this week`;
  const container=$('timetable-days');container.replaceChildren();
  for(const day of days){
   const card=document.createElement('section');card.className='student-day timetable-day';
   const heading=document.createElement('h3');heading.textContent=day.name;card.append(heading);
   if(day.meetings.length){
    const list=document.createElement('ul');list.className='timetable-meetings';
    for(const meeting of day.meetings){
     const item=document.createElement('li');
     const course=document.createElement('strong');
     course.textContent=`${meeting.code} · ${meeting.section}`;
     const title=document.createElement('span');title.textContent=meeting.title;
     const time=document.createElement('span');time.textContent=range(meeting.start,meeting.end);
     const room=document.createElement('span');room.textContent=`${meeting.instructor} · ${meeting.room}`;
     item.append(course,title,time,room);
     list.append(item);
    }
    card.append(list);
   }else{
    const message=document.createElement('p');message.className='no-free-periods';message.textContent='No scheduled classes';card.append(message);
   }
   container.append(card);
  }
  $('timetable-results').hidden=false;
 }catch(error){
  $('timetable-results').hidden=true;$('timetable-error').textContent=error.message;$('timetable-error').hidden=false;
 }
}
function syncSections(){
 const allGroups = [...engine.groups.values()];
 const sections=allGroups.filter(g=>g.code===$('course').value).sort((a,b)=>a.section.localeCompare(b.section));
 $('section').replaceChildren(...sections.map(g=>new Option(g.section,g.section)));
 syncGroup();
}
function syncGroup(){
 const g=group();
 const instructors=[...new Set(g.meetings.map(id=>engine.meetingMap.get(id).instructor))];
 $('selection-meta').innerHTML=`<strong>${g.students.length} students</strong> · ${esc(instructors.join(', '))}`;
 $('roster-count').textContent=g.students.length;
 $('roster').innerHTML=g.students.map(s=>`<span>${esc(s.roll)}</span>`).join('');
 $('session').replaceChildren(...g.meetings.map(id=>{const m=engine.meetingMap.get(id);return new Option(`${engine.data.days[m.day]} · ${range(m.start,m.end)}`,String(id));}));
 syncMode();stale();
}
function syncMode(){
 $('move-controls').hidden=mode()!=='move';
 const previous=$('duration').querySelector('option[data-original]');
 if(previous)previous.remove();
 if(mode()==='move'){
  const m=engine.meetingMap.get(Number($('session').value));
  const opt=new Option(`${m.end-m.start} minutes · same as selected class`,String(m.end-m.start));
  opt.dataset.original='true';$('duration').prepend(opt);opt.selected=true;
 }else $('duration').value='80';
 stale();
}
function configuration(){return {code:$('course').value,section:$('section').value,duration:Number($('duration').value),mode:mode(),moveId:mode()==='move'?Number($('session').value):null};}
function run(){
 try{
  let settings = configuration();
  result=engine.check(settings);
  $('error').hidden=true;$('empty').hidden=true;$('result-content').hidden=false;$('stale').hidden=true;
  renderResults();return result;
 }catch(error){fail(error.message);throw error;}
}
function renderResults(){
 const {group:g,cells,duration,moved}=result;
 $('result-title').textContent=`${g.code} · ${g.title}`;
 $('result-description').textContent=`${g.section} · ${g.students.length} enrolled students · ${duration}-minute ${moved?'replacement':'additional'} class`;
 $('checked-badge').textContent='Full timetables checked';
 let free = cells.filter(c=>c.status==='free').length;
 let busy = cells.filter(c=>c.status==='busy').length;
 let outside = cells.filter(c=>c.status==='outside').length;
 $('summary').innerHTML=`<div class="metric good"><strong>${free}</strong><span>slots free for everyone</span></div><div class="metric"><strong>${g.students.length}</strong><span>students checked</span></div><div class="metric"><strong>${busy}</strong><span>slots with student clashes</span></div>`;
 const tbody=$('availability').querySelector('tbody');tbody.replaceChildren();
 for(const start of engine.data.starts){
  const tr=document.createElement('tr');const th=document.createElement('th');th.scope='row';th.textContent=clock(start);tr.append(th);
  for(let day=0;day<5;day++){
   const c=cells.find(c=>c.day===day&&c.start===start);const td=document.createElement('td');const b=document.createElement('button');b.type='button';
   b.className=`slot ${c.status==='current'?'outside':c.status}`;b.dataset.day=day;b.dataset.start=start;
   const title=c.status==='free'?'Available':c.status==='current'?'Current class':c.status==='outside'?'Too late':`${c.conflicts.length} ${c.conflicts.length===1?'clash':'clashes'}`;
   const subtitle=c.status==='outside'?'Past 5:30 PM':c.status==='current'?'Already scheduled':`${c.freeStudents}/${g.students.length} free`;
   b.innerHTML=`<strong>${title}</strong><small>${subtitle}</small>`;
   b.setAttribute('aria-label',`${engine.data.days[day]}, ${range(c.start,c.end)}: ${title}. ${subtitle}.`);
   b.setAttribute('aria-pressed','false');b.addEventListener('click',()=>showSlot(c,true));td.append(b);tr.append(td);
  }tbody.append(tr);
 }
 const first=cells.find(c=>c.status==='free')||cells.find(c=>c.status==='busy')||cells[0];
 showSlot(first,false);
 $('summary').setAttribute('aria-label',`${free} available slots, ${busy} slots with clashes, ${outside} slots extending beyond 5:30 PM.`);
}
function showSlot(c,focus){
 selectedSlot=c;
 document.querySelectorAll('.slot').forEach(b=>{
   const selected=Number(b.dataset.day)===c.day&&Number(b.dataset.start)===c.start;
   b.classList.toggle('selected',selected);
   b.setAttribute('aria-pressed',String(selected));
 });
 const title=`${engine.data.days[c.day]} · ${range(c.start,c.end)}`;
 const labels={free:'Available for everyone',busy:'Student clashes',outside:'Outside timetable hours',current:'Current class'};
 let html=`<div class="detail-top"><h3>${title}</h3><span class="status ${c.status==='free'?'free':''}">${labels[c.status]}</span></div>`;
 if(c.status==='outside')html+=`<p class="detail-note">A ${result.duration}-minute class at this time would end after 5:30 PM. The uploaded timetable does not cover the full proposed period.</p>`;
 else if(c.status==='current')html+=`<div class="success-box"><p>This is the existing class time. It is shown for reference, rather than offered as a new slot.</p></div>`;
 else if(c.status==='free')html+=`<div class="success-box"><p><strong>All ${result.group.students.length} students are free for this entire period.</strong> Confirm the teacher and an available room before arranging the class.</p></div>`;
 else html+=`<p class="detail-note"><strong>${c.conflicts.length} of ${result.group.students.length} students</strong> have an overlapping class. ${c.freeStudents} students are free.</p>`;
 if(c.current&&c.status==='busy')html+=`<p class="detail-note">This is the selected class's current time. Other courses still clash after excluding that class.</p>`;
 if(c.conflicts.length&&c.status!=='outside'){
  html+='<div class="clash-list">'+c.conflicts.map(s=>`<div class="clash-row"><div class="clash-roll">${esc(s.roll)}<div class="source-note">PDF p. ${s.page}</div></div><div>${s.meetings.map(m=>`<p><strong>${esc(m.code)} · ${esc(m.section)}</strong> — ${esc(m.title)}</p><p>${range(m.start,m.end)} · ${esc(m.instructor)} · ${esc(m.room)}</p>`).join('')}</div></div>`).join('')+'</div>';
 }
 if(result.moved)html+=`<p class="source-note">Excluded from this check: ${esc(result.moved.code)} ${esc(result.moved.section)}, ${engine.data.days[result.moved.day]} ${range(result.moved.start,result.moved.end)}. Other meetings remain scheduled.</p>`;
 $('slot-detail').innerHTML=html;
 if(focus)$('slot-detail').focus({preventScroll:true});
}
async function init(){
 try{
  const response=await fetch('./data.json');
  if(!response.ok){
   throw Error('The timetable could not be loaded. Reload the page to try again.');
  }
  engine=createEngine(await response.json());
  const courses=[...new Map([...engine.groups.values()].map(g=>[g.code,{code:g.code,title:g.title}])).values()].sort((a,b)=>a.code.localeCompare(b.code));
  $('course').replaceChildren(...courses.map(c=>new Option(`${c.code} · ${c.title}`,c.code)));
  // Start with the course associated with the user's selected CSV row.
  $('course').value='CS3002';syncSections();$('section').value='BSE-7A';syncGroup();
  $('course').disabled=false;$('section').disabled=false;$('rearrange').disabled=false;
  $('course').addEventListener('change',syncSections);$('section').addEventListener('change',syncGroup);
  document.querySelectorAll('input[name="mode"]').forEach(el=>el.addEventListener('change',syncMode));
  $('session').addEventListener('change',syncMode);$('duration').addEventListener('change',stale);
  $('planner').addEventListener('submit',e=>{e.preventDefault();run();});
  $('planner-menu').addEventListener('click',()=>showView('planner'));
  $('student-menu').addEventListener('click',()=>showView('student'));
  $('student-timetable-menu').addEventListener('click',()=>showView('timetable'));
  $('student-lookup').addEventListener('submit',lookupStudent);
  $('timetable-lookup').addEventListener('submit',lookupTimetable);
  // A useful first view; the same action remains available after selection.
  run();
  registerTools();
 }catch(error){fail(error.message);$('empty').hidden=true;}
}
function registerTools(){
 const context=document.modelContext;if(!context?.registerTool)return;
 const lifecycle=new AbortController();window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
 const tools=[{
  name:'list_course_sections',title:'List course sections',description:'List course sections and their enrolled student counts from the uploaded Fall 2026 timetable.',
  inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},
  execute:()=>[...engine.groups.values()].map(g=>({code:g.code,title:g.title,section:g.section,students:g.students.length,meetings:g.meetings.map(id=>engine.meetingMap.get(id))}))
 },{
  name:'check_class_availability',title:'Check class availability',description:'Select a course section and show student availability for an additional or replacement class. Does not change or book the timetable. Times are minutes after midnight in campus local time.',
  inputSchema:{type:'object',properties:{code:{type:'string'},section:{type:'string'},duration:{type:'integer',minimum:1,maximum:570},mode:{type:'string',enum:['extra','move']},moveId:{type:'integer'}},required:['code','section','duration','mode'],additionalProperties:false},annotations:{readOnlyHint:false},
  execute:input=>{
   // Validate before changing the visible selection.
   const checked=engine.check(input);
   $('course').value=input.code;syncSections();$('section').value=input.section;syncGroup();
   document.querySelector(`input[name="mode"][value="${input.mode}"]`).checked=true;
   if(input.mode==='move')$('session').value=String(input.moveId);syncMode();
   if(![...$('duration').options].some(o=>Number(o.value)===input.duration))$('duration').append(new Option(`${input.duration} minutes`,String(input.duration)));
   $('duration').value=String(input.duration);run();
   return {code:checked.group.code,section:checked.group.section,students:checked.group.students.length,slots:result.cells.map(c=>({day:engine.data.days[c.day],start:clock(c.start),end:clock(c.end),status:c.status,conflictingStudents:c.conflicts.map(s=>s.roll)}))};
  }
 }];
 for(const tool of tools){try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}
}
init();
