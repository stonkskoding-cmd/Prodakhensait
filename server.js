
require('dotenv').config();
const express=require('express');
const http=require('http');
const mongoose=require('mongoose');
const cors=require('cors');
const {Server}=require('socket.io');
const jwt=require('jsonwebtoken');
const bcrypt=require('bcrypt');

const User=require('./models/User');
const Chat=require('./models/Chat');
const Message=require('./models/Message');
const Girl=require('./models/Girl');

const app=express();
const server=http.createServer(app);
const io=new Server(server,{cors:{origin:"*"}});

mongoose.connect(process.env.MONGO_URI).then(()=>console.log("DB OK"));

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const auth=(roles=[])=> (req,res,next)=>{
 const token=req.headers.authorization;
 if(!token) return res.status(401).json({err:"no token"});
 try{
  const data=jwt.verify(token,process.env.JWT_SECRET);
  if(roles.length && !roles.includes(data.role)) return res.status(403).end();
  req.user=data;
  next();
 }catch(e){res.status(401).end();}
};

// --- AUTH ---
app.post('/api/register', async (req,res)=>{
 const hash=await bcrypt.hash(req.body.password,10);
 const u=await User.create({...req.body,password:hash});
 res.json(u);
});
app.post('/api/login', async (req,res)=>{
 const u=await User.findOne({username:req.body.username});
 if(!u) return res.status(400).end();
 const ok=await bcrypt.compare(req.body.password,u.password);
 if(!ok) return res.status(400).end();
 const token=jwt.sign({id:u._id,role:u.role},process.env.JWT_SECRET);
 res.json({token});
});

// --- GIRLS (admin) ---
app.get('/api/girls', async (req,res)=>res.json(await Girl.find()));
app.post('/api/girls', auth(['admin']), async (req,res)=>res.json(await Girl.create(req.body)));
app.delete('/api/girls/:id', auth(['admin']), async (req,res)=>{
 await Girl.findByIdAndDelete(req.params.id); res.json({ok:true});
});

// --- CHAT ---
app.post('/api/chat/create', async (req,res)=>{
 const chat=await Chat.create({status:"new"});
 await Message.create({chatId:chat._id,sender:"bot",text:"Здравствуйте! Ожидайте оператора"});
 res.json(chat);
});
app.get('/api/chat/:id', async (req,res)=>res.json(await Message.find({chatId:req.params.id})));
app.get('/api/operator/chats', auth(['operator','admin']), async (req,res)=>res.json(await Chat.find()));

app.post('/api/chat/take/:id', auth(['operator']), async (req,res)=>{
 await Chat.findByIdAndUpdate(req.params.id,{status:"in_work",operatorId:req.user.id});
 res.json({ok:true});
});
app.post('/api/chat/close/:id', auth(['operator']), async (req,res)=>{
 await Chat.findByIdAndUpdate(req.params.id,{status:"closed"});
 res.json({ok:true});
});

// socket
io.on('connection',socket=>{
 socket.on('join',({chatId})=>socket.join(chatId));
 socket.on('send', async data=>{
  const msg=await Message.create(data);
  io.to(data.chatId).emit('msg',msg);
 });
});

server.listen(process.env.PORT||3000,()=>console.log("RUN"));
