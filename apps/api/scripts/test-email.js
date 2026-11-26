import 'dotenv/config';
import nodemailer from 'nodemailer';
import {z} from 'zod';
import {notificationMessage,smtpConfig} from '../src/email.js';

const [flag,recipient]=process.argv.slice(2);
if(flag!=='--to'||process.argv.length!==4||!z.string().email().safeParse(recipient).success){
  console.error('Usage: npm run email:test -w @gallermo/api -- --to recipient@example.com');
  process.exit(1);
}
try{
  await nodemailer.createTransport(smtpConfig()).sendMail(notificationMessage({kind:'test',recipient}));
  console.log('Gmail accepted the test message.');
}catch{
  console.error('The test message could not be sent. Check the Gmail SMTP settings.');
  process.exitCode=1;
}
