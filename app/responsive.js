(()=>{
 'use strict';
 function labelTables(){
  document.querySelectorAll('.table-scroll .table').forEach(table=>{
   const headers=[...table.querySelectorAll('thead th')].map(cell=>cell.textContent.trim());
   if(!headers.length)return;
   table.setAttribute('data-responsive-table','');
   table.setAttribute('role','table');
   table.querySelectorAll('thead,tbody').forEach(group=>group.setAttribute('role','rowgroup'));
   table.querySelectorAll('tr').forEach(row=>row.setAttribute('role','row'));
   table.querySelectorAll('th').forEach(cell=>cell.setAttribute('role','columnheader'));
   table.querySelectorAll('tbody tr').forEach(row=>[...row.cells].forEach((cell,i)=>{
    cell.setAttribute('role','cell');
    cell.setAttribute('data-cell-label',headers[i]||'');
   }));
  });
 }
 let scheduled=false;
 const observer=new MutationObserver(()=>{
  if(scheduled)return;scheduled=true;
  requestAnimationFrame(()=>{scheduled=false;labelTables();});
 });
 observer.observe(document.getElementById('app'),{childList:true,subtree:true});
 labelTables();
})();
