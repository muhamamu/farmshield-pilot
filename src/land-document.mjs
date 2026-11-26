export const documentTypes={occupancy:'Certificate of Occupancy',assignment:'Deed of Assignment',lease:'Lease agreement',survey:'Survey plan',other:'Other land evidence'};
export const rightsTypes={owner:'Owner',tenant:'Tenant or leaseholder',customary:'Customary land user',joint:'Joint ownership',other:'Other land-use rights'};
export const retentionTypes={remove_after_review:'Remove after review',retain_for_future:'Retain for future verification'};
export const reviewTypes={reviewed:'Evidence reviewed',more_evidence:'More evidence needed',not_accepted:'Evidence not accepted'};
const extensions={'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png'};
export function documentSubmission(registration,values,id=crypto.randomUUID()){
 const {file,kind,rights,retention,consent}=values;
 if(!file?.size||file.size>10485760||!Object.hasOwn(extensions,file.type)||!Object.hasOwn(documentTypes,kind)||!Object.hasOwn(rightsTypes,rights)||!Object.hasOwn(retentionTypes,retention)||consent!==true)throw Error('Choose a supported document, land-use right and retention preference, and confirm sharing.');
 return {id,registration_id:registration.id,owner_id:registration.owner_id,object_path:`${registration.owner_id}/${registration.id}/${kind}-${id}.${extensions[file.type]}`,document_type:kind,rights_basis:rights,retention_choice:retention};
}
export function documentState(row,fileExists){const review=row.farmshield_land_document_reviews;const removal=row.farmshield_land_removal_requests;return {label:!fileExists?'File removed or unavailable':removal?'Removal requested':review?reviewTypes[review.decision]:'Awaiting review',canRemove:fileExists&&Boolean(removal||review&&row.retention_choice==='remove_after_review')};}
