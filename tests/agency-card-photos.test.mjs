import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {isCardPhoto,photoStats,compressStoredPhoto,compressCardFile,PHOTO_TARGET_CHARS} from '../agency-visits/modules/card-photo.js?v=1.26';
const prefix='data:image/jpeg;base64,';
test('counts only actual image data and retains small originals',async()=>{
 const small=prefix+'A'.repeat(6000);
 const rows=[{contacts:[{photo:small},{photo:'https://example.com/card.png'},{photo:small}]},{contacts:[]}];
 assert.deepEqual(photoStats(rows),{count:2,chars:small.length*2,megabytes:Number((small.length*2/1024/1024).toFixed(2))});
 assert.equal(isCardPhoto('javascript:alert(1)'),false);
 assert.equal(await compressStoredPhoto(small),small);
});
test('compresses a large legacy card, does not increase image size, and closes upload bitmap',async()=>{
 const original={document:globalThis.document,Image:globalThis.Image,createImageBitmap:globalThis.createImageBitmap};
 let drawn=0,bitmapClosed=false;
 globalThis.document={createElement(type){assert.equal(type,'canvas');return{
  width:0,height:0,
  getContext(){return {set fillStyle(_v){},fillRect(){},drawImage(){drawn++}}},
  toDataURL(type){assert.equal(type,'image/jpeg');return prefix+'B'.repeat(29000)}
 }}};
 globalThis.Image=class{width=1600;height=900;set src(value){this.url=value}async decode(){}};
 globalThis.createImageBitmap=async()=>({width:1600,height:900,close(){bitmapClosed=true}});
 try{
  const old=prefix+'A'.repeat(100000);
  const resized=await compressStoredPhoto(old);
  assert(isCardPhoto(resized));assert(resized.length<old.length*0.5);assert(resized.length<=PHOTO_TARGET_CHARS);
  const fresh=await compressCardFile({type:'image/jpeg'});
  assert(isCardPhoto(fresh));assert(bitmapClosed);assert(drawn>=2);
 }finally{globalThis.document=original.document;globalThis.Image=original.Image;globalThis.createImageBitmap=original.createImageBitmap}
});
test('existing pictures cannot be replaced by output that saves less than 10 percent',async()=>{
 const old=prefix+'A'.repeat(60000),original={document:globalThis.document,Image:globalThis.Image};
 globalThis.Image=class{width=1200;height=800;async decode(){}set src(v){this.url=v}};
 globalThis.document={createElement(){return {width:0,height:0,getContext(){return{set fillStyle(v){},fillRect(){},drawImage(){}}},toDataURL(){return prefix+'B'.repeat(57000)}}}};
 try{assert.equal(await compressStoredPhoto(old),old)}finally{globalThis.document=original.document;globalThis.Image=original.Image}
});
test('PWA and settings expose the single-shot batch optimizer with recoverable source backups',()=>{
 const app=fs.readFileSync('agency-visits/app.js','utf8'),
 html=fs.readFileSync('agency-visits/index.html','utf8'),
 service=fs.readFileSync('agency-visits/sw.js','utf8'),
 optimizer=fs.readFileSync('agency-visits/modules/photo-optimizer.js','utf8'),
 contacts=fs.readFileSync('agency-visits/modules/contacts.js','utf8');
 assert(app.includes('initCardPhotoOptimizer()'));assert(app.includes('renderCardPhotoOptimizer()'));
 assert(html.includes('id="compressOldCards"'));assert(html.includes('id="cardPhotoCompressionStatus"'));
 assert(service.includes('modules/card-photo.js?v=1.26'));assert(service.includes('modules/photo-optimizer.js?v=1.26'));
 assert(contacts.includes('compressCardFile(file)'));assert(!contacts.includes('await compress(file)'));
 assert(optimizer.includes('await writePending('));assert(optimizer.includes('await store.saveConfirmed('));
});
