import React from 'react';
import {Minus,Plus} from 'lucide-react';

export default function QuantityControl({lang,quantity,onDecrease,onIncrease}){
  const ar=lang==='ar';
  return <div className="quantity-control" role="group" aria-label={ar?'الكمية':'Quantity'}>
    <button type="button" disabled={!onDecrease} onClick={onDecrease} aria-label={ar?'تقليل الكمية':'Decrease quantity'}><Minus size={16}/></button>
    <output>{quantity}</output>
    <button type="button" disabled={!onIncrease} onClick={onIncrease} aria-label={ar?'زيادة الكمية':'Increase quantity'}><Plus size={16}/></button>
  </div>;
}
