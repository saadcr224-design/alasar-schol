import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyLedger,mutate,pendingInvoices,studentMonthlyRecords,balance,sessionLedger,feeGenerationPlan,academicYearMonths,addMonths} from '../lib/ledger.ts';
function fixture(){return mutate(emptyLedger(),'student',{name:'Test student',roll:'TEST-1',className:'Class 1',guardian:'Test guardian',fee:5000,discount:500});}
function generate(s,month='2026-01',endMonth='2026-03'){return mutate(s,'generate',{scope:'All students',month,endMonth,due:month+'-31'});}
test('Monthly fees enter dues and pending once, with correct due dates and discounts',()=>{
 const s=generate(fixture());assert.equal(s.invoices.length,3);assert.equal(pendingInvoices(s,'2026-03').reduce((n,i)=>n+balance(s,i),0),13500);
 assert.equal(s.invoices[1].due,'2026-02-28');assert.throws(()=>generate(s),/No new fees/);
 const next=generate(s,'2026-03','2026-04');assert.equal(next.invoices.length,4);
 assert.equal(studentMonthlyRecords(next,next.students[0].id,'2026-04')[0].totalDue,18000);
});
test('Partial payment, reversal and hidden reminders keep pending totals correct',()=>{
 let s=generate(fixture());const studentId=s.students[0].id;
 s=mutate(s,'payment_range',{studentId,fromMonth:'2026-03',toMonth:'2026-03',amount:6000,date:'2026-03-10',method:'Cash'});
 assert.equal(pendingInvoices(s,'2026-03').length,2);
 assert.equal(studentMonthlyRecords(s,studentId,'2026-03')[0].totalDue,7500);
 s=mutate(s,'delete_reminder',{invoiceId:s.invoices[1].id});assert.equal(pendingInvoices(s,'2026-03').length,2);
 s=mutate(s,'void',{id:s.payments[0].id,reason:'Test reversal'});
 assert.equal(studentMonthlyRecords(s,studentId,'2026-03')[0].totalDue,13500);
});
test('Unissued months, separate fee months, deleted fees and future fees are represented accurately',()=>{
 let s=generate(fixture(),'2026-01','2026-01');const studentId=s.students[0].id;
 s=mutate(s,'invoice',{studentId,month:'2026-03',due:'2026-04-10',amount:1000,label:'Transport'});
 const rows=studentMonthlyRecords(s,studentId,'2026-03');assert.equal(rows[1].status,'Not issued');assert.equal(rows[0].totalDue,5500);
 assert.equal(pendingInvoices(s,'2026-02').length,1);
 s=mutate(s,'delete_fee',{invoiceId:s.invoices[0].id});assert.equal(studentMonthlyRecords(s,studentId,'2026-03')[0].totalDue,1000);
 assert.throws(()=>mutate(s,'invoice',{studentId,month:'2026-13',due:'2026-04-10',amount:1,label:'Invalid'}),/valid month/);
});
test('Deleted and inactive students are not billed; sessions remain isolated',()=>{
 let s=fixture();s=mutate(s,'delete_student',{id:s.students[0].id});assert.throws(()=>generate(s),/No active students/);
 s=fixture();s=mutate(s,'create_session',{name:'Next session'});const id=s.sessions[1].id;
 s=generate(s);assert.equal(pendingInvoices(sessionLedger(s,id),'2026-03').length,0);
 assert.equal(s.invoices.length,3);
});
test('Admission fee fields persist and validate without changing earlier student records',()=>{
 let s=fixture();s=mutate(s,'student',{...s.students[0],transportFee:2200,uniformFee:1500,booksFee:2000,examFee:500,openingArrears:1000,lateFee:300});
 const st=s.students[0];assert.equal(st.transportFee,2200);assert.equal(st.lateFee,300);
 const {transportFee,...legacyEdit}=st;s=mutate(s,'student',{...legacyEdit,name:'Updated student'});assert.equal(s.students[0].transportFee,2200);
 assert.throws(()=>mutate(s,'student',{...st,booksFee:-1}),/valid amount/);
});
test('Generation review matches saved charges for 1–12 months and skips duplicates',()=>{
 let s=fixture();s=mutate(s,'student',{...s.students[0],transportFee:2200,uniformFee:1500,booksFee:2000,examFee:500,openingArrears:1000,lateFee:300});
 const p={scope:'Individual student',studentId:s.students[0].id,month:'2026-04',endMonth:'2027-03',due:'2026-04-30',includeUniform:true,includeBooks:true,includeExam:true,includeArrears:true,includeLate:true};
 const plan=feeGenerationPlan(s,p);assert.equal(plan.months.length,12);assert.equal(plan.charges.length,29);
 const next=mutate(s,'generate',p);assert.deepEqual(next.invoices.map(({id,...i})=>i),plan.charges);
 assert.equal(feeGenerationPlan(next,p).charges.length,0);
 assert.equal(next.invoices.filter(i=>i.label==='Transport').length,12);
 assert.equal(next.invoices.filter(i=>i.label==='Late fee').length,1);
 const later=mutate(next,'generate',{...p,month:'2027-04',endMonth:'2027-04',due:'2027-04-10'});
 assert.equal(later.invoices.filter(i=>i.label==='Opening arrears').length,1);
 assert.throws(()=>feeGenerationPlan(s,{...p,endMonth:'2027-04'}),/1 and 12/);
});
test('All student records contain complete April–March years without issuing unselected months',()=>{
 const s=fixture(),id=s.students[0].id;
 const rows=studentMonthlyRecords(s,id,'2026-10');assert.equal(rows.length,12);assert.equal(rows[0].month,'2027-03');assert.equal(rows.at(-1).month,'2026-04');assert.ok(rows.every(r=>r.status==='Not issued'));
 assert.equal(s.invoices.length,0);assert.equal(academicYearMonths('2027-02')[0],'2026-04');assert.equal(addMonths('2026-12',2),'2027-02');
});
test('Class and sibling previews include only the selected active students and preserve existing balances',()=>{
 let s=fixture();s=mutate(s,'student',{name:'Second student',roll:'TEST-2',guardian:'Parent',className:'Class 2',fee:1000,discount:0,familyId:'F1'});
 s=mutate(s,'student',{name:'Third student',roll:'TEST-3',guardian:'Parent',className:'Class 2',fee:1000,discount:0,familyId:'F1',active:false});
 const p={month:'2026-04',endMonth:'2026-05',due:'2026-04-10'};
 assert.equal(feeGenerationPlan(s,{...p,scope:'Entire class',className:'Class 2'}).charges.length,2);
 assert.equal(feeGenerationPlan(s,{...p,scope:'Sibling family',familyId:'F1'}).students.length,1);
 assert.equal(feeGenerationPlan(s,{...p,scope:'All students'}).charges.length,4);
});
