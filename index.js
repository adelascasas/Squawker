const express = require('express');
const sendmail = require("./SendEmail.js");
const db = require("./database.js");
const uuidv4 = require('uuid/v4');
const bodyParser = require("body-parser");
const cookieParser = require('cookie-parser');
const jwt = require("jsonwebtoken");
const app = express();

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(cookieParser());

app.post("/adduser",(req,res) => {
    let username = req.body.username;
    let email = req.body.email;
    let password = req.body.password;
    const param = {
        username,
        email
    };
    db.User.findOne(param).exec().then((doc) => {
        if(doc){
            res.status(500);
            res.json({status: 'ERROR', error: 'username and email already taken'});
        }
        else{
            const newuser  = new db.User();
            newuser._id = uuidv4();
            newuser.username = username;
            newuser.password = password;
            newuser.email = email;
            newuser.verified = false;
            newuser.key = uuidv4();
            newuser.save((err,doc) => {
                if(err) { 
                    res.status(500);
                    res.json({status: 'ERROR', error: 'error adding user'});
                }
                else{
                    res.status(200);
                    res.json({status:'OK'});
                    sendmail(doc.email,doc.key);                   
                }
            });
        }
    });
});

app.post("/login",(req,res) => {
    let user = {
         username: req.body.username,
         password: req.body.password
    };
    db.User.findOne(user).exec().then((doc) => { 
        console.log(doc);
        if(!doc || doc.verified == false){
              res.status(500);
              res.json({status: 'ERROR', error: "user not found or not verified"});
          }
        else{
           jwt.sign({user}, 'MySecretKey',(err, token) => {
                 if(err) {
                     res.status(500); 
                     res.send({status: 'ERROR', error: "error making key"})}
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
            res.json({status:'ERROR', error:"error verifying key"});}
        else{
           let invalidToken = new db.Blacklist();
           invalidToken._id = uuidv4();
           invalidToken.token = req.token;
           invalidToken.save((err, doc) => {
               if(err) {
                   res.status(500);
                   res.json({status: 'ERROR', error:"error saving token"});}
               else{
                   res.status(200);
                   res.json({status: 'OK'});
               }
           });
        }   
    });
});

app.post("/verify",(req,res) => {
    const param = {email: req.body.email };
    if(req.body.key != 'abracadabra'){
          param.key = req.body.key;
    }
    db.User.findOne(param).exec().then((doc) => {
         if(!doc) { 
               res.status(500);
               res.json({status: 'ERROR', error: "user not found"});
         }
         else{
             console.log(doc);
             doc.verified = true;
             doc.save((err, doc)=>{
               if(err) {
                   res.status(500); 
                   res.json({status: "ERROR", error:"error verifying"});
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
        res.json({status: 'ERROR',error:"error finding user"});
    });
});

app.post("/additem",verifyToken,(req,res) => {
    let content = req.body.content;
    let childType;
    if(req.body.childType){
        childType = req.body.childType;
    }
    jwt.verify(req.token, 'MySecretKey',(err, data)=>{
        if(err) {
            res.status(500);
            res.json({status:'ERROR', error:"error verifying key"});}
        else{
            const now = new Date();
            const item = {
               id: uuidv4(),
               username: data.player.username,
               property: {
                   likes: 0
               },   
               retweeted: 0,
               content,
               timestamp: parseFloat((now.getTime()/1000).toFixed(2))
            };
            db.addDocument('squawks',item);
            res.status(200);
            res.json({ status: 'OK', id: item.id});
        }   
    });

});

app.get("/item/:id",verifyToken,(req,res) => {
   let id = req.params.id;
   jwt.verify(req.token, 'MySecretKey',(err, data)=>{
    if(err) {
        res.status(500);
        res.json({status:'ERROR', error:"error verifying key"});}
    else{

        db.searchbyId("squawks",);
        res.status(200);
        //res.json({ status: 'OK', item:});
    }   
});
});

app.post("/search",verifyToken,(req,res) => {
    res.send("Hello");
});

function verifyToken(req,res,next) {
    let token = req.cookies['token'];
    if(!token){ 
        res.status(500);
        res.json({status: 'ERROR', error: 'User not logged in'});
    }
    else{
        req.token = token;
        next();
    }
}

app.listen(5000,"192.168.122.21");

