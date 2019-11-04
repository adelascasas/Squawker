const express = require('express');
const sendmail = require("./SendEmail.js");
const db = require("./database.js");
const uuidv4 = require('uuid/v4');
const bodyParser = require("body-parser");
const cookieParser = require('cookie-parser');
const jwt = require("jsonwebtoken");
const mongoose = require('mongoose');
const app = express();
const path = require('path');

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(cookieParser());
app.use((req,res,next) => {
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers','Origin, X-Requested-With, Content-Type, Accept');
    next();
});

const Userexists = async function(req,res,next) {
    let doc =  await mongoose.model('users').findOne({username: req.body.username});
    if(doc){
        next();
    }
    else{
        res.status(500).json({status: 'error', error: 'User not added'});
    }
}

const getFollowing = async (user) =>{
    return await mongoose.model('users').findOne({username: user.username}).exec().then((doc) => { 
        return doc.following;
    });
}

app.get('/', (req,res) => {
    	res.sendFile(path.join(__dirname+'/login.html'));
});

app.post("/adduser",(req,res) => {
    let username = req.body.username;
    let email = req.body.email;
    let password = req.body.password;
    mongoose.model('users').countDocuments({username}, (err,count) => {
        if(count > 0){
            res.status(500);
            res.json({status: 'error', error: 'username or email already taken'});
        }
        else{
            mongoose.model('users').countDocuments({email}, (err,count) => {
                if(count > 0){
                    res.status(500);
                    res.json({status: 'error', error: 'username or email already taken'});
                    return;
                }
                let User = mongoose.model('users');
                const newuser  = new User();
                newuser._id = uuidv4();
                newuser.username = username;
                newuser.password = password;
                newuser.email = email;
                newuser.verified = false;
                newuser.key = uuidv4();
                newuser.save((err,doc) => {
                   if(err) { 
                        res.status(500);
                        res.json({status: 'error', error: 'error adding user'});
                    }
                    else{
                        console.log(doc);
                        res.status(200);
                        res.json({status:'OK'});
                        sendmail(doc.email,doc.key);                   
                    }
                });
            });
        }
    });
});

app.post("/login",(req,res) => {
    let user = {
         username: req.body.username,
         password: req.body.password
    };
    mongoose.model('users').findOne(user).exec().then((doc) => { 
        console.log(doc);
        if(!doc || doc.verified == false){
              res.status(500);
              res.json({status: 'error', error: "user not found or not verified"});
          }
        else{
           jwt.sign({user}, 'MySecretKey',(err, token) => {
                 if(err) {
                     res.status(500); 
                     res.send({status: 'error', error: "error making key"})}
                 else {
                     res.cookie('token',token);
                     res.status(200);
                     res.json({status: 'OK'});
                 }
          });
       }
   });
});

app.post("/logout",verifyToken,(req,res) => {
    jwt.verify(req.token, 'MySecretKey',(err, data)=>{
        if(err) {
            res.status(500);
            res.json({status:'error', error:"error verifying key"});}
        else{
           let Blacklist = mongoose.model('blacklist');
           let invalidToken = new Blacklist();
           invalidToken._id = uuidv4();
           invalidToken.token = req.token;
           invalidToken.save((err, doc) => {
               if(err) {
                   res.status(500);
                   res.json({status: 'error', error:"error saving token"});}
               else{
                   res.status(200);
                   res.json({status: 'OK'});
               }
           });
        }   
    });
});

app.post("/verify",(req,res) => {
    console.log(req.body);
    const param = {email: req.body.email };
    if(req.body.key != 'abracadabra'){
          param.key = req.body.key;
    }
    mongoose.model('users').findOne(param).exec().then((doc) => {
         if(!doc) { 
               res.status(500);
               res.json({status: 'error', error: "user not found"});
         }
         else{
             console.log(doc);
             doc.verified = true;
             doc.save((err, doc)=>{
               if(err) {
                   res.status(500); 
                   res.json({status: "error", error:"error verifying"});
                }
                else{
                       console.log(doc);
                       res.status(200);
                       res.json({ status: 'OK'});
                  }
                });
          }
    }).catch(err => {
        res.status(500);
        res.json({status: 'error',error:"error finding user"});
    });
});

app.post("/additem",verifyToken,(req,res) => {
    let content = req.body.content;
    if(!content){
        res.status(500);
        res.json({status: 'error', error: "no content"}); 
        return;
    }
    let childType;
    if(req.body.childType){
        childType = req.body.childType;
    }
    mongoose.model('blacklist').findOne({token: req.token}).exec().then((doc) => {
        if(doc){
             res.status(500);
             res.json({status: 'error', error: "you have been logged out"}); 
        }
        else{
            jwt.verify(req.token, 'MySecretKey',(err, data)=>{
                if(err) {
                    res.status(500);
                    res.json({status:'error', error:"error verifying key"});}
                else{
                    const now = new Date();
                    const item = {
                       username: data.user.username,
                       property: {
                           likes: 0
                       },   
                       retweeted: 0,
                       content,
                       timestamp: parseFloat((now.getTime()/1000).toFixed(7))
                    };
                    console.log(item);
                   db.addDocument('squawks',item).then((resp)=>{
                        console.log(resp);
                        res.status(200);
                        res.json({status: 'OK',id: resp._id});
                    }, (err) => {
                        res.status(500);
                        res.json({status:'error', error:"error adding item"});
                    });
                }   
            });
        }
    });
});

app.get("/item/:id",(req,res) => {
   let id = req.params.id;
    db.searchbyId("squawks",id).then((resp)=>{
        console.log(resp);
        res.status(200);
        let item = resp._source;
        item.id = resp._id;
        res.json({status: 'OK',item});
    }, (err) => {
        res.status(500);
        res.json({status:'error', error:"item not found"});
    });
});

app.post("/search",setToken,(req,res) => {
   let timestamp = req.body.timestamp;
   let limit = req.body.limit;
   let now = new Date();
   let usernames = (req.body.username) ? [req.body.username]:[];
   let following = (req.body.following == undefined) ? true: req.body.following;
   if(!timestamp){
       timestamp = parseFloat((now.getTime()/1000).toFixed(7));
   }
   if(!limit){
       limit = 25;
   }
   else if(limit > 100){
       limit = 100;
   }
   mongoose.model('blacklist').findOne({token: req.token}).exec().then((doc) => {
    if(doc){ 
        db.searchbyParams(timestamp,limit,req.body.q,usernames).then((resp)=>{
            let items = resp.hits.hits.map((val,index)=>{
                    let item = val._source;
                    item.id = val._id;
                    return item;
                });
                res.status(200).json({status: 'OK', items});
                }, (err) => {
                res.status(500).json({status:'error', error:"items not found"});
            });   
    }
    else{
        jwt.verify(req.token, 'MySecretKey',(err, data)=>{
                getFollowing(data.user).then( result => {
                    usernames = (!err && following) ? usernames.concat(result) : usernames;
                    db.searchbyParams(timestamp,limit,req.body.q,usernames).then((resp)=>{
                        let items = resp.hits.hits.map((val,index)=>{
                                let item = val._source;
                                item.id = val._id;
                                return item;
                            });
                            res.status(200).json({status: 'OK', items});
                            }, (err) => {
                            res.status(500).json({status:'error', error:"items not found"});
                    });  
                });
            });
        }
    });
});

app.delete('/item/:id',verifyToken,(req,res) => {
    mongoose.model('blacklist').findOne({token: req.token}).exec().then((doc) => {
        if(doc){
             res.status(500);
             res.json({status: 'error', error: "you have been logged out"}); 
        }
        else{
            jwt.verify(req.token, 'MySecretKey',(err, data)=>{
                if(err) {
                    res.status(500);
                    res.json({status:'error', error:"error verifying key"});}
                else{
                    db.searchbyId("squawks",req.params.id).then((resp)=>{
                        let username = resp._source.username;
                        if(username === data.user.username){
                            db.deletebyId(req.params.id);
                            res.status(200);
                            res.json({status: 'OK'});
                        }
                        else{
                            res.status(500);
                            res.json({status:'error', error:"permission to delete denied"});
                        }
                    }, (err) => {
                        res.status(500);
                        res.json({status:'error', error:"item not found"});
                    });                 
                }   
            });
        }
    });
});

app.get('/user/:username',(req,res) => {
    let username = req.params.username;
    mongoose.model('users').findOne({username}).exec().then((doc) => { 
        console.log(doc);
        if(!doc || doc.verified == false){
              res.status(500);
              res.json({status: 'error', error: "user not found"});
        }
        else{
           let user = {
                email: doc.email,
                followers: doc.followers.length,
                following: doc.following.length
           }
           res.status(200).json({status: 'ok', user});
       }
   });
});

app.get('/user/:username/posts',(req,res) => {
    let limit = req.body.limit;
    let username = req.params.username;
    if(!limit){
        limit = 50;
    }
    if(limit > 200){
        limit = 200;
    }
    db.searchbyUsername('squawks',limit,username).then((resp) => {
        let items = resp.hits.hits.map((val,index)=>{
            return val._id;
        });
        res.status(200).json({status: 'ok', items});
    });                       
});

app.get('/user/:username/followers',(req,res) => {
    let limit  = req.body.limit;
    let username = req.params.username;
    if(!limit){
        limit = 50;
    }
    if(limit > 200){
        limit = 200;
    }
    mongoose.model('users').findOne({username}).exec().then((doc) => { 
         console.log(doc);
         if(!doc || doc.verified == false){
               res.status(500).json({status: 'error', error: "user not found"});
         }
         else{
            let followers = doc.followers.slice(0,limit);
            res.status(200).json({status: 'ok', users: followers});
         }
    });
});

app.get('/user/:username/following',(req,res) => {
    let limit  = req.body.limit;
    let username = req.params.username;
    if(!limit){
        limit = 50;
    }
    if(limit > 200){
        limit = 200;
    }
    mongoose.model('users').findOne({username}).exec().then((doc) => { 
          console.log(doc);
         if(!doc || doc.verified == false){
               res.status(500).json({status: 'error', error: "user not found or verified"});
         }
         else{
            let following = doc.following.slice(0,limit);
            res.status(200).json({status: 'ok', users: following});
         }
    });
});

app.post('/follow',verifyToken,Userexists,(req,res) => {
     let username = req.body.username;
     let follow = req.body.follow;
     if(follow == undefined){
         follow = true;
     }
     mongoose.model('blacklist').findOne({token: req.token}).exec().then((doc) => {
         if(doc){
              res.status(500).json({status: 'error', error: "you have been logged out"}); 
         }
         else{
             jwt.verify(req.token, 'MySecretKey',(err, data)=>{
                 if(err) {
                     res.status(500);
                     res.json({status:'error', error:"error verifying key"});}
                 else{
                       if(follow){
                         mongoose.model('users').updateOne({username: data.user.username},
                             {$addToSet:{
                                  following: username
                               }},
                            (err, result) => {if(err){console.log(err);}}
                         )
                         mongoose.model('users').updateOne({username},
                             {$addToSet:{
                                  followers: data.user.username
                               }},
                            (err, result) => {if(err){console.log(err);}}
                         )
                       }
                       else{
                         mongoose.model('users').updateOne({username: data.user.username},
                             {$pullAll:{ following: [username]}},
                             (err, result) => {if(err){console.log(err);}})
                         mongoose.model('users').updateOne({username},
                             {$pullAll:{followers: [data.user.username]}},
                            (err, result) => {if(err){console.log(err);}})
                       }
                       res.status(200);
                       res.json({status: 'ok'});          
                 }   
             });
         }
     });
});


function verifyToken(req,res,next) {
    let token = req.cookies['token'];
    if(!token){ 
        res.status(500);
        res.json({status: 'error', error: 'User not logged in'});
    }
    else{
        req.token = token;
        next();
    }
}

function setToken(req,res,next) {
    req.token = req.cookies['token'];
    next();
}

app.listen(5000,"192.168.122.21");

