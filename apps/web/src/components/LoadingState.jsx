import React from 'react';

export function LoadingState({label,kind='rows',count=3}) {
  return <div role="status" aria-busy="true" className={kind==='products'?'product-grid skeleton-grid':'skeleton-rows'}>
    <span className="sr-only">{label}</span>
    {Array.from({length:count},(_,index)=><div key={index} className="skeleton" aria-hidden="true"/>)}
  </div>;
}

export function RetryState({lang,onRetry,invalid=false}) {
  return <div className="empty-state" role="alert">
    <p>{invalid ? (lang==='ar'?'راجع قيم البحث والتصفية.':'Check the search and filter values.') :
      (lang==='ar'?'المتجر غير متاح مؤقتًا.':'The store is temporarily unavailable.')}</p>
    {onRetry&&<button type="button" className="button-secondary" onClick={onRetry}>{lang==='ar'?'إعادة المحاولة':'Try again'}</button>}
  </div>;
}

export function StoreImage({src,alt,...props}) {
  return <img {...props} src={src || '/gallermo-logo.webp'} alt={alt} onError={event=>{
    const image=event.currentTarget;
    if (image.getAttribute('src')!=='/gallermo-logo.webp') image.src='/gallermo-logo.webp';
  }}/>;
}

export function MutationLabel({busy,label,lang}){
  return <>{busy&&<span className="mutation-spinner" aria-hidden="true"/>}{busy?(lang==='ar'?'جارٍ التنفيذ…':'Working…'):label}</>;
}
