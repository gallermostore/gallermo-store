import React,{useEffect,useRef,useState} from 'react';
import {api} from '../App.jsx';

export async function uploadFile(file,purpose,params={},signal){
  if(file.size>10*1024*1024)throw Object.assign(new Error('File exceeds 10 MB'),{code:'INVALID_IMAGE'});
  const query=new URLSearchParams(params);
  return api('/private/'+purpose+(query.size?'?'+query:''),{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:file,signal});
}
export function ArtworkDialog({dialog,lang,product,variant,onAccept,replace=false}){
  const ar=lang==='ar';
  const [file,setFile]=useState(null);
  const [preview,setPreview]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const request=useRef(null);
  useEffect(()=>{
    if(!file){setPreview('');return;}
    const url=URL.createObjectURL(file);
    setPreview(url);
    return ()=>URL.revokeObjectURL(url);
  },[file]);
  useEffect(()=>()=>request.current?.abort(),[]);
  const reset=()=>{request.current?.abort();setFile(null);setError('');setBusy(false);};
  return <dialog ref={dialog} className="artwork-dialog" aria-label={ar?'تصميمك الخاص':'Your artwork'} onClose={reset}
    onClick={event=>{if(event.target===event.currentTarget){const box=event.currentTarget.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.current.close();}}}>
    <form className="stack-form" onSubmit={async event=>{
      event.preventDefault();
      if(!file||busy)return;
      const controller=new AbortController();
      request.current=controller;
      setBusy(true);setError('');
      try{
        const asset=await uploadFile(file,'artwork',{slug:product.slug,sku:variant.sku},controller.signal);
        if(onAccept(asset.id))dialog.current.close();
        else setError(ar?'لا يمكن إضافة هذه الكمية إلى السلة.':'That quantity cannot be added to the cart.');
      }catch(error){
        if(error.name!=='AbortError')setError(error.code==='INVALID_IMAGE'?(ar?'اختر صورة صالحة ضمن الحد المحدد.':'Choose a valid image within the size limit.'):(ar?'تعذّر رفع الصورة. حاول مرة أخرى.':'The image could not be uploaded. Try again.'));
      }finally{if(!controller.signal.aborted)setBusy(false);}
    }}>
      <h2>{ar?'خصّص هذا المنتج':'Customize this'}</h2>
      <p>{ar?'ارفع صورة JPEG أو PNG أو WebP حتى ١٠ ميجابايت. تعرض المعاينة ملف التصميم.':'Choose a JPEG, PNG or WebP image up to 10 MB. The preview shows your artwork file.'}</p>
      <label>{ar?'صورة التصميم':'Artwork image'}<input aria-describedby="artwork-error" type="file" accept="image/jpeg,image/png,image/webp"
        onChange={event=>{if(event.target.files[0]){setFile(event.target.files[0]);setError('');event.target.value='';}}} disabled={busy}/></label>
      {preview&&<div><p className="muted file-name">{file?.name}</p><img className="artwork-preview" src={preview} alt={ar?'معاينة التصميم':'Artwork preview'}/>
        <button type="button" className="button-secondary" onClick={()=>{setFile(null);dialog.current.querySelector('input').value='';}} disabled={busy}>{ar?'إزالة الصورة':'Remove image'}</button></div>}
      <p id="artwork-error" className="inline-error" role="alert">{error}</p>
      <div className="drawer-form-actions">
        <button className="button-secondary" type="button" onClick={()=>dialog.current.close()}>{ar?'إلغاء':'Cancel'}</button>
        <button className="button-primary" type="submit" disabled={!file||busy}>{busy?(ar?'جارٍ الرفع…':'Uploading…'):(replace?(ar?'احفظ التصميم الجديد':'Save replacement artwork'):(ar?'أضف المنتج المخصص':'Add customized item'))}</button>
      </div>
    </form>
  </dialog>;
}
