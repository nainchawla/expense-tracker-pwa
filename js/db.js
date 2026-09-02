/* Small promise-based IndexedDB helper; transaction records remain the source of truth. */
const DB = (() => {
  const name='my-budget-db', version=1;
  const open=()=>new Promise((resolve,reject)=>{const r=indexedDB.open(name,version);r.onupgradeneeded=()=>{const d=r.result;['settings','incomeEvents','expenses','cycles'].forEach(s=>d.createObjectStore(s,{keyPath:'id'}));};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  const run=async(store,mode,fn)=>{const d=await open();return new Promise((resolve,reject)=>{const t=d.transaction(store,mode), r=fn(t.objectStore(store));r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);t.oncomplete=()=>d.close();});};
  return {get:(s,k)=>run(s,'readonly',o=>o.get(k)),all:s=>run(s,'readonly',o=>o.getAll()),put:(s,v)=>run(s,'readwrite',o=>o.put(v)),del:(s,k)=>run(s,'readwrite',o=>o.delete(k)),clear:s=>run(s,'readwrite',o=>o.clear())};
})();
