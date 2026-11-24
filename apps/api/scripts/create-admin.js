import 'dotenv/config';
import mongoose from 'mongoose';
import readline from 'node:readline/promises';
import {stdin as input,stdout as output} from 'node:process';
import {User} from '../src/models.js';
import {hashPassword} from '../src/security.js';
if(!process.env.MONGODB_URI)throw Error('MONGODB_URI missing');
if(!input.isTTY)throw Error('Run this command in an interactive terminal');
const rl=readline.createInterface({input,output});
try{
 const email=(await rl.question('Admin email: ')).trim().toLowerCase();
 const password=await rl.question('Admin password (visible in terminal; use a private session, min 12 chars): ');
 if(!/^\S+@\S+\.\S+$/.test(email)||password.length<12)throw Error('Invalid email or password under 12 characters');
 await mongoose.connect(process.env.MONGODB_URI);
 if(await User.exists({email}))throw Error('Email exists. Refusing to overwrite/upgrade an existing account.');
 await User.create({email,passwordHash:await hashPassword(password),name:'Gallermo Administrator',role:'admin'});
 console.log('Admin created. Enable MFA before production launch.');
}finally{rl.close();if(mongoose.connection.readyState===1)await mongoose.disconnect()}
