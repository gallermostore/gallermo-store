import {z} from 'zod';
import {Category, Product, Order, Bundle} from './models.js';

export const slug = z.string().regex(/^[a-z0-9][a-z0-9-]{1,95}$/);
export const categoryRules = {
  requiresPrepayment: z.boolean().default(false),
  customizationEnabled: z.boolean().default(false)
};
export function categoryPolicy(category) {
  return {requiresPrepayment: category?.requiresPrepayment === true, customizationEnabled: category?.customizationEnabled === true};
}
export const publicProduct = {deletedAt:null,published:true};
const price = z.string().regex(/^\d{1,7}(\.\d{1,2})?$/).transform(Number).pipe(z.number().max(1000000));
const integer = max => z.string().regex(/^\d{1,4}$/).transform(Number).pipe(z.number().int().min(1).max(max));
export const catalogSchema = z.object({
  category:slug.optional(),
  q:z.string().trim().max(75).optional(),
  availability:z.enum(['in_stock','out_of_stock']).optional(),
  minPrice:price.optional(),maxPrice:price.optional(),
  sort:z.enum(['featured','newest','price_asc','price_desc','name']).default('featured'),
  page:integer(500).optional().transform(page=>page??1),
  limit:integer(24).optional().transform(limit=>limit??12)
}).strict().refine(value=>value.minPrice === undefined || value.maxPrice === undefined || value.minPrice <= value.maxPrice, {
  path:['maxPrice'],message:'Maximum price must be at least the minimum.'
});

const sorts = {
  featured:{featured:-1,createdAt:-1,_id:1},
  newest:{createdAt:-1,_id:1},
  price_asc:{catalogPrice:1,_id:1},
  price_desc:{catalogPrice:-1,_id:1},
  name:{'name.en':1,_id:1}
};

export function catalogStages(filters, categorySlugs) {
  const match = {...publicProduct,categorySlug:{$in:categorySlugs}};
  if (filters.q) {
    const escaped = filters.q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    match.$or = ['name.en','name.ar','variants.sku'].map(field=>({[field]:{$regex:escaped,$options:'i'}}));
  }
  const inRange = [{$in:[{$type:'$$v.priceEGP'},['double','int','long','decimal']]}];
  if (filters.minPrice !== undefined) inRange.push({$gte:['$$v.priceEGP',filters.minPrice]});
  if (filters.maxPrice !== undefined) inRange.push({$lte:['$$v.priceEGP',filters.maxPrice]});
  const available = {$or:[{$eq:[{$ifNull:['$$v.stock',null]},null]},{$gt:['$$v.stock',0]}]};
  const outOfStock = {$eq:['$$v.stock',0]};
  const hasRange = filters.minPrice !== undefined || filters.maxPrice !== undefined;
  const eligible = filters.availability === 'out_of_stock' && !hasRange ? outOfStock : available;
  const select = cond => ({$filter:{input:'$variants',as:'v',cond}});
  const stages = [
    {$match:match},
    {$set:{eligibleVariants:select({$and:[eligible,...inRange]}),availableVariants:select(available)}}
  ];
  if (filters.availability === 'out_of_stock') stages.push({$match:{'availableVariants.0':{$exists:false}}});
  if (hasRange || filters.availability) stages.push({$match:{'eligibleVariants.0':{$exists:true}}});
  stages.push({$set:{displayVariant:{$first:{$sortArray:{
    input:{$cond:[{$gt:[{$size:'$eligibleVariants'},0]},'$eligibleVariants','$variants']},
    sortBy:{priceEGP:1,sku:1}
  }}}}});
  stages.push({$set:{catalogPrice:'$displayVariant.priceEGP',displayVariantSku:'$displayVariant.sku'}});
  stages.push({$unset:['displayVariant','availableVariants','eligibleVariants','sourceFile','deletedAt','__v']});
  return stages;
}

export async function listProducts(filters) {
  const categories = await Category.find({published:true,...(filters.category ? {slug:filters.category} : {})}).distinct('slug');
  const base = catalogStages(filters,categories);
  const count = await Product.aggregate([...base,{$count:'total'}]).option({maxTimeMS:3000});
  const total = count[0]?.total ?? 0;
  const page = Math.min(filters.page,Math.max(1,Math.ceil(total/filters.limit)));
  const items = total ? await Product.aggregate([...base,{$sort:sorts[filters.sort]},{$skip:(page-1)*filters.limit},{$limit:filters.limit}]).option({maxTimeMS:3000}) : [];
  return {items,total,page,limit:filters.limit};
}

export async function findProduct(slug) {
  const product = await Product.findOne({slug,...publicProduct}).select('-sourceFile -__v -deletedAt').lean();
  if (!product) return null;
  const category = await Category.findOne({slug:product.categorySlug,published:true}).lean();
  return category ? {...product,category:{slug:category.slug,name:category.name,...categoryPolicy(category)}} : null;
}

export async function relatedProducts(product) {
  return Product.find({...publicProduct,categorySlug:product.categorySlug,slug:{$ne:product.slug},
    variants:{$elemMatch:{$or:[{stock:null},{stock:{$gt:0}}]}}})
    .select('-sourceFile -__v -deletedAt').sort({featured:-1,createdAt:-1,_id:1}).limit(4).lean();
}

export async function bestsellers() {
  const categories = await Category.find({published:true}).distinct('slug');
  return Order.aggregate([
    {$match:{status:'delivered'}},{$unwind:'$lines'},
    {$project:{sold:{$cond:[{$eq:['$lines.kind','product']},
      [{slug:'$lines.slug',quantity:'$lines.quantity'}],
      {$map:{input:{$ifNull:['$lines.components',[]]},as:'component',in:{
        slug:'$$component.slug',quantity:{$multiply:['$lines.quantity','$$component.quantity']}
      }}}
    ]}}},
    {$unwind:'$sold'},{$group:{_id:'$sold.slug',sold:{$sum:'$sold.quantity'}}},
    {$lookup:{from:Product.collection.name,localField:'_id',foreignField:'slug',as:'product'}},
    {$unwind:'$product'},
    {$match:{'product.deletedAt':null,'product.published':true,'product.categorySlug':{$in:categories},
      'product.variants':{$elemMatch:{$or:[{stock:null},{stock:{$gt:0}}]}}}},
    {$sort:{sold:-1,_id:1}},{$limit:8},{$replaceWith:'$product'},{$unset:['sourceFile','deletedAt','__v']}
  ]).option({maxTimeMS:3000});
}

export async function publicBundles(slug) {
  const bundles=await Bundle.find({published:true,...(slug?{slug}:{})}).sort({_id:1}).limit(slug?1:24).lean();
  const slugs=[...new Set(bundles.flatMap(bundle=>bundle.items.map(item=>item.productSlug)))];
  const products=await Product.find({...publicProduct,slug:{$in:slugs}}).select('slug categorySlug variants').lean();
  const categories=await Category.find({published:true,slug:{$in:products.map(product=>product.categorySlug)}}).lean();
  const byProduct=new Map(products.map(product=>[product.slug,product]));
  const byCategory=new Map(categories.map(category=>[category.slug,category]));
  return bundles.flatMap(bundle=>{
    let requiresPrepayment=false;
    const quantities=new Map();
    if(!bundle.items.length)return [];
    for(const item of bundle.items){
      const product=byProduct.get(item.productSlug);
      const category=byCategory.get(product?.categorySlug);
      const variant=product?.variants.find(variant=>variant.sku===item.variantSku);
      const key=item.productSlug+':'+item.variantSku;
      const amount=(quantities.get(key)||0)+item.quantity;
      quantities.set(key,amount);
      if(!category||!variant||variant.stock!=null&&variant.stock<amount)return [];
      requiresPrepayment ||= category.requiresPrepayment===true;
    }
    return [{...bundle,requiresPrepayment}];
  });
}
