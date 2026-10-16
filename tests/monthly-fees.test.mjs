import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyLedger,mutate,pendingInvoices,studentMonthlyRecords,balance,sessionLedger} from '../lib/ledger.ts';
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
 let s=fixture();s=mutate(s,'delete_student',{id:s.students[0].id});assert.throws(()=>generate(s),/No new fees/);
 s=fixture();s=mutate(s,'create_session',{name:'Next session'});const id=s.sessions[1].id;
 s=generate(s);assert.equal(pendingInvoices(sessionLedger(s,id),'2026-03').length,0);
 assert.equal(s.invoices.length,3);
});
