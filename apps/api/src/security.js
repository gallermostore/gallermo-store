import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import {User,Session} from './models.js';
const prod=process.env.NODE_ENV==='production';
const cookieName=prod?'__Host-gallermo_session':'gallermo_session';
const ttl=1000*60*60*24*7;
export const hashPassword=(password)=>bcrypt.hash(password,12);
export const verifyPassword=(plain,hash)=>bcrypt.compare(plain,hash);
const tokenHash=(token)=>crypto.createHash('sha256').update(token).digest('hex');
export async function createSession(res,user){
  const token=crypto.randomBytes(32).toString('base64url');
  await Session.create({userId:user._id,tokenHash:tokenHash(token),expiresAt:new Date(Date.now()+ttl)});
  res.cookie(cookieName,token,{httpOnly:true,secure:prod,sameSite:'lax',path:'/',maxAge:ttl});
}
export async function currentUser(req,res,next){
  try{
    const token=req.cookies?.[cookieName];
    if(!token)return next();
    const sess=await Session.findOne({tokenHash:tokenHash(token),expiresAt:{$gt:new Date()}});
    if(sess)req.user=await User.findById(sess.userId).select('_id name email role');
    next();
  }catch(e){next(e)}
}
export async function logout(req,res){
  const token=req.cookies?.[cookieName];
  if(token)await Session.deleteOne({tokenHash:tokenHash(token)});
  res.clearCookie(cookieName,{path:'/',httpOnly:true,secure:prod,sameSite:'lax'});
}
export function requireRole(role){return(req,res,next)=>!req.user?res.status(401).json({error:'Sign in required'}):req.user.role!==role?res.status(403).json({error:'Forbidden'}):next()}
export function originGuard(req,res,next){
  if(['GET','HEAD','OPTIONS'].includes(req.method))return next();
  const origin=req.get('origin');
  const referer=req.get('referer');
  const permitted=process.env.CLIENT_ORIGIN||'http://localhost:5173';
  if(origin===permitted || (!origin && referer?.startsWith(permitted+'/')))return next();
  return res.status(403).json({error:'Request origin rejected'});
}
export function safeParse(schema,body){const result=schema.safeParse(body);if(!result.success){const e=new Error('Invalid input');e.status=400;e.details=result.error.flatten();throw e}return result.data}
