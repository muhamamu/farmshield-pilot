export const JOURNAL_KINDS=[['planting','Planting'],['watering','Watering'],['fertiliser','Fertiliser'],['pests','Pests'],['harvest','Harvest'],['field-check','Field check'],['other','Other']];
export const PHOTO_BUCKET='farmshield-journal';
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export const todayWAT=(now=Date.now())=>new Date(now+3600000).toISOString().slice(0,10);
export function validDate(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&value>='2000-01-01'&&value<='2100-12-31'&&Number.isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;}
function scope(owner,farm){if(!uuid(owner)||!uuid(farm))throw Error('Sign in and choose a saved farm.');}
export function journalInput(draft,now=Date.now()){
 const notes=String(draft.notes||'').trim();if(!notes||notes.length>4000)throw Error('Enter a journal note of up to 4,000 characters.');
 if(!JOURNAL_KINDS.some(([kind])=>kind===draft.kind))throw Error('Choose an entry type.');
 if(!validDate(draft.date)||draft.date>todayWAT(now))throw Error('Choose a valid journal date, up to today.');
 return {kind:draft.kind,entry_date:draft.date,notes};
}
export function taskInput(draft){
 const title=String(draft.title||'').trim(),due_date=draft.dueDate,remind_on=draft.remindOn||due_date;
 if(!title||title.length>160)throw Error('Enter a task title of up to 160 characters.');
 if(!validDate(due_date)||!validDate(remind_on)||remind_on>due_date)throw Error('The reminder date must be on or before the due date.');
 return {title,due_date,remind_on,priority:draft.priority==='high'?'high':'normal'};
}
export function taskStatus(task,today=todayWAT()){if(task.archived)return 'Archived';if(task.completed)return 'Completed';if(task.due_date<today)return 'Overdue';if(task.due_date===today)return 'Due today';if(task.remind_on<=today)return 'Reminder';return 'Upcoming';}
export async function loadFarmActivity(client,owner,farm){
 scope(owner,farm);
 async function rows(table,order){const all=[];for(let offset=0;;offset+=500){const {data,error}=await client.from(table).select('*').eq('owner_id',owner).eq('local_farm_id',farm).order(order,{ascending:table==='farmshield_tasks'}).order('id').range(offset,offset+499);if(error)throw error;all.push(...data);if(data.length<500)return all;}}
 const [journal,tasks]=await Promise.all([rows('farmshield_journal','entry_date'),rows('farmshield_tasks','due_date')]);return {journal,tasks};
}
export async function createJournalEntry(client,owner,farm,draft,photos=[],guard=()=>true){
 scope(owner,farm);const input=journalInput(draft);if(photos.length>4||photos.some(photo=>photo.type!=='image/jpeg'||photo.size>2097152||photo.size===0))throw Error('Use up to four prepared JPEG photos, no larger than 2 MB each.');
 const id=crypto.randomUUID(),uploaded=[];const storage=client.storage.from(PHOTO_BUCKET);
 try{
  for(const photo of photos){if(!guard())throw Error('The account or farm changed. Reload before saving.');const path=owner+'/'+farm+'/'+id+'/'+crypto.randomUUID()+'.jpg';const {error}=await storage.upload(path,photo,{contentType:'image/jpeg',cacheControl:'300',upsert:false});if(error)throw error;uploaded.push(path);}
  if(!guard())throw Error('The account or farm changed. Reload before saving.');
  const {data,error}=await client.from('farmshield_journal').insert({id,owner_id:owner,local_farm_id:farm,...input,photo_paths:uploaded}).select('*').single();if(error)throw error;if(!data)throw Error('The entry could not be saved.');return data;
 }catch(error){if(uploaded.length){try{const removed=await storage.remove(uploaded);if(removed.error)throw removed.error;}catch{throw Error('Entry was not saved. Some private photo uploads could not be cleaned up; keep your draft and retry.');}}throw error;}
}
export async function createFarmTask(client,owner,farm,draft,alertKey=null){
 scope(owner,farm);const input=taskInput(draft);if(alertKey!==null&&(typeof alertKey!=='string'||!alertKey.length||alertKey.length>100))throw Error('Invalid alert reference.');
 const {data,error}=await client.from('farmshield_tasks').insert({owner_id:owner,local_farm_id:farm,...input,source_alert_key:alertKey}).select('*').single();if(error){if(error.code==='23505')throw Error('A task already exists for this weather signal.');throw error;}if(!data)throw Error('The task could not be saved.');return data;
}
export async function updateActivity(client,table,owner,farm,row,patch){
 scope(owner,farm);const allowed=table==='farmshield_journal'?['kind','entry_date','notes','photo_paths','archived']:table==='farmshield_tasks'?['title','due_date','remind_on','priority','completed','archived']:[];
 if(!allowed.length||Object.keys(patch).some(key=>!allowed.includes(key))||!Number.isFinite(Number(row.revision)))throw Error('Invalid activity update.');
 const {data,error}=await client.from(table).update(patch).eq('owner_id',owner).eq('local_farm_id',farm).eq('id',row.id).eq('revision',row.revision).select('*').maybeSingle();if(error)throw error;if(!data)throw Error('This record changed elsewhere. Refresh before trying again.');return data;
}
export async function journalPhotoUrls(client,owner,farm,entry){
 scope(owner,farm);const prefix=owner+'/'+farm+'/'+entry.id+'/';
 return Promise.all((entry.photo_paths||[]).filter(path=>typeof path==='string'&&path.startsWith(prefix)).map(async path=>{const {data,error}=await client.storage.from(PHOTO_BUCKET).createSignedUrl(path,300);return {path,url:error?null:data?.signedUrl};}));
}
