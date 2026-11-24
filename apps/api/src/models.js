import mongoose from 'mongoose';
const { Schema, model } = mongoose;
const bilingual = new Schema({en:{type:String,default:''},ar:{type:String,default:''}}, {_id:false});
const variant = new Schema({sku:{type:String,required:true},label:{type:String,required:true},priceEGP:{type:Number,required:true,min:0},stock:{type:Number,default:null,min:0}}, {_id:false});
const image = new Schema({url:{type:String,required:true},alt:{type:String,default:''}}, {_id:false});
const addon = new Schema({code:String,label:{type:bilingual},priceEGP:{type:Number,min:0}}, {_id:false});
export const Category = model('Category',new Schema({slug:{type:String,unique:true,required:true},name:{type:bilingual,required:true},description:bilingual,published:{type:Boolean,default:false},sortOrder:{type:Number,default:0},image:String,requiresPrepayment:{type:Boolean,default:false},customizationEnabled:{type:Boolean,default:false}},{timestamps:true}));
export const Product = model('Product',new Schema({slug:{type:String,unique:true,required:true},name:{type:bilingual,required:true},description:bilingual,categorySlug:{type:String,required:true,index:true},images:[image],variants:[variant],addons:[addon],published:{type:Boolean,default:false},featured:{type:Boolean,default:false},nameNeedsReview:{type:Boolean,default:false},sourceFile:String,deletedAt:{type:Date,default:null}},{timestamps:true}));
Product.schema.index({published:1,categorySlug:1,createdAt:-1});
export const Bundle = model('Bundle',new Schema({slug:{type:String,unique:true,required:true},name:{type:bilingual,required:true},description:bilingual,items:[{productSlug:String,variantSku:String,quantity:{type:Number,min:1}}],priceEGP:{type:Number,required:true,min:0},published:{type:Boolean,default:false},images:[image]},{timestamps:true}));
export const Discount = model('Discount',new Schema({code:{type:String,unique:true,required:true,uppercase:true},kind:{type:String,enum:['percent','fixed'],required:true},amount:{type:Number,min:0,required:true},minimumEGP:{type:Number,min:0,default:0},maxUses:{type:Number,min:0,default:null},usedCount:{type:Number,min:0,default:0},expiresAt:Date,enabled:{type:Boolean,default:false}},{timestamps:true}));
export const User = model('User',new Schema({name:{type:String,required:true},email:{type:String,unique:true,required:true,lowercase:true},passwordHash:{type:String,required:true,select:false},role:{type:String,enum:['customer','admin'],default:'customer'}},{timestamps:true}));
export const Session = model('Session',new Schema({userId:{type:Schema.Types.ObjectId,ref:'User',required:true},tokenHash:{type:String,required:true,unique:true},expiresAt:{type:Date,required:true}},{timestamps:true}));
Session.schema.index({expiresAt:1},{expireAfterSeconds:0});
const categorySnapshot=new Schema({slug:String,requiresPrepayment:Boolean,customizationEnabled:Boolean},{_id:false});
const componentSnapshot=new Schema({slug:String,sku:String,quantity:Number,category:categorySnapshot},{_id:false});
const artworkSnapshot=new Schema({assetId:String,width:Number,height:Number},{_id:false});
const stockReservation=new Schema({productId:Schema.Types.ObjectId,sku:String,quantity:Number},{_id:false});
const orderLine = new Schema({kind:{type:String,enum:['product','bundle']},slug:String,title:String,variantSku:String,variantLabel:String,addons:[String],unitPriceEGP:Number,quantity:Number,lineTotalEGP:Number,category:categorySnapshot,components:{type:[componentSnapshot],default:undefined},customization:artworkSnapshot},{_id:false});
export const Order = model('Order',new Schema({number:{type:String,unique:true,required:true},userId:{type:Schema.Types.ObjectId,ref:'User',default:null,index:true},customer:{name:String,email:String,phone:String,governorate:String,address:String,notes:String},lines:[orderLine],subtotalEGP:Number,discountEGP:Number,shippingEGP:Number,totalEGP:Number,discountCode:String,paymentMethod:{type:String,enum:['cod','instapay','instapay_deposit']},paymentStatus:{type:String,enum:['unpaid','awaiting_transfer','proof_submitted','verified','rejected'],default:'unpaid'},paymentReference:String,paymentProofKey:String,requiredUpfrontPiastres:Number,verifiedPiastres:Number,balancePiastres:Number,collectedAtDeliveryPiastres:Number,totalPiastres:Number,currency:String,ownerKey:String,requestFingerprint:String,stockReservations:{type:[stockReservation],default:undefined},inventoryReleasedAt:Date,discountId:Schema.Types.ObjectId,status:{type:String,enum:['pending','confirmed','processing','shipped','delivered','cancelled'],default:'pending'},idempotencyKey:{type:String,unique:true,sparse:true},events:[{status:String,note:String,createdAt:{type:Date,default:Date.now}}]},{timestamps:true}));

export const PrivateAsset = model('PrivateAsset',new Schema({
 _id:String,owner:{type:String,required:true},purpose:{type:String,enum:['artwork','payment'],required:true},
 productSlug:String,variantSku:String,width:Number,height:Number,orderNumber:{type:String,default:null},
 expiresAt:{type:Date,required:true}
},{timestamps:true}));
PrivateAsset.schema.index({orderNumber:1,expiresAt:1});
export const PaymentReference = model('PaymentReference',new Schema({_id:String,orderNumber:{type:String,required:true}},{timestamps:true}));
Order.schema.index({status:1,'lines.slug':1});
