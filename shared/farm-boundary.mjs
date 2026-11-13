export function boundaryError(points){
 if(!Array.isArray(points)||points.length<3)return 'Add at least three corners to outline your land.';
 if(points.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)))return 'The outline contains an invalid point.';
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const on=(a,b,p)=>Math.abs(cross(a,b,p))<1e-12&&p[0]>=Math.min(a[0],b[0])&&p[0]<=Math.max(a[0],b[0])&&p[1]>=Math.min(a[1],b[1])&&p[1]<=Math.max(a[1],b[1]);
 for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length];
  if(a[0]===b[0]&&a[1]===b[1])return 'Two corners overlap. Undo the last corner and try again.';
  for(let j=i+1;j<points.length;j++){
   if(j===i+1||(i===0&&j===points.length-1))continue;
   const c=points[j],d=points[(j+1)%points.length];
   if((cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)||on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b))return 'The outline crosses itself. Move a corner or undo it.';
  }
 }
 let area=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];area+=a[0]*b[1]-b[0]*a[1]}
 return Math.abs(area)<1e-10?'Spread the corners out to enclose a piece of land.':null;
}

// Spherical polygon area in hectares. This is an imagery-based estimate, not a survey.
export function boundaryAreaHa(points){
 const error=boundaryError(points);if(error)throw new Error(error);
 const rad=Math.PI/180,radius=6371008.8;let sum=0;
 for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length];let delta=(b[1]-a[1])*rad;
  if(delta>Math.PI)delta-=2*Math.PI;if(delta< -Math.PI)delta+=2*Math.PI;
  sum+=delta*(Math.sin(a[0]*rad)+Math.sin(b[0]*rad));
 }
 return Math.abs(sum*radius*radius/2)/10000;
}
export function withFarmBoundary(farm,boundary){
 return {...farm,boundary,size:boundaryAreaHa(boundary),areaSource:'outline',enteredAreaHa:farm.enteredAreaHa??(farm.areaSource==='outline'?null:farm.size)};
}
export function formatAreaHa(value){return Number(value).toLocaleString('en-NG',{maximumFractionDigits:4})}
