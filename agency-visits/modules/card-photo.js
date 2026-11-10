// On-device JPEG optimization only. Never delete the original image until the cloud confirms the replacement.
export const CARD_PHOTO_LIMIT=180000;
export const PHOTO_TARGET_CHARS=42000;
export const isCardPhoto=value=>typeof value==='string'&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value);
export const photoStats=rows=>{
 let count=0,chars=0;
 for(const agency of rows||[])for(const contact of agency.contacts||[])if(isCardPhoto(contact.photo)){count++;chars+=contact.photo.length}
 return{count,chars,megabytes:Number((chars/1024/1024).toFixed(2))};
};
function paint(image,canvas,maxEdge){
 const maxDimension=Math.max(image.width,image.height),ratio=Math.min(1,maxEdge/maxDimension);
 const width=Math.max(1,Math.round(image.width*ratio)),height=Math.max(1,Math.round(image.height*ratio));
 if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height}
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('此裝置無法壓縮名片');
 ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);ctx.drawImage(image,0,0,width,height);
}
async function optimize(image,original='',maxChars=CARD_PHOTO_LIMIT){
 if(!image.width||!image.height)throw Error('無法讀取名片影像尺寸');
 const canvas=document.createElement('canvas');
 // Preserve adequate resolution for text; reduce JPEG quality and dimensions progressively.
 const options=[[1400,.78],[1400,.68],[1250,.72],[1250,.60],[1150,.62],[1100,.52]];
 let previousEdge=0,best='';
 for(const [edge,quality] of options){
  if(previousEdge!==edge){paint(image,canvas,edge);previousEdge=edge}
  const candidate=canvas.toDataURL('image/jpeg',quality);
  if(!isCardPhoto(candidate))continue;
  if(!best||candidate.length<best.length)best=candidate;
  if(candidate.length<=PHOTO_TARGET_CHARS)break;
 }
 canvas.width=1;canvas.height=1;
 if(original)return best&&best.length<original.length*.90?best:original;
 if(best&&best.length<=maxChars)return best;
 throw Error('名片圖片仍過大，請先裁切照片');
}
export async function compressCardFile(file){
 const bitmap=await createImageBitmap(file);
 try{return await optimize(bitmap)}finally{bitmap.close()}
}
export async function compressStoredPhoto(photo){
 if(!isCardPhoto(photo)||photo.length<=PHOTO_TARGET_CHARS)return photo;
 const image=new Image();
 image.src=photo;
 try{await image.decode()}catch{throw Error('舊名片影像無法解碼')}
 return optimize(image,photo);
}
