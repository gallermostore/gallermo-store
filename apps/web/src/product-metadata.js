export function productStructuredData({product,name,description,canonical,checkoutEnabled}) {
  const variant=product.variants.find(item=>item.stock!==0)||product.variants[0];
  return {
    '@context':'https://schema.org','@type':'Product',name,description,
    url:canonical,image:product.images.map(image=>new URL(image.url,canonical).href),sku:variant?.sku,
    brand:{'@type':'Brand',name:'Gallermo Store'},
    ...(variant&&checkoutEnabled?{offers:{
      '@type':'Offer',price:variant.priceEGP,priceCurrency:'EGP',url:canonical,
      availability:variant.stock===0?'https://schema.org/OutOfStock':'https://schema.org/InStock'
    }}:{})
  };
}
