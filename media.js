const express = require('express');
const database = require('./database');
const router = express.Router();
const formidable = require('formidable');
const jwt = require("jsonwebtoken");
const mongoose = require('mongoose');
const uuidv4 = require('uuid/v4');
const FileReader = require("filereader");




router.post('/addmedia',verifyToken ,(req, res) => {
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
                    new formidable.IncomingForm().parse(req,(err,fields,files) => {
                        let parseFiles = Object.entries(files);
                        let reader = new FileReader();
                        reader.readAsDataURL(parseFiles[0][1]);
                        let extension = (parseFiles[0][1]).type;
                        reader.onload = function() {
                            let result =   reader.result.substring(reader.result.indexOf(",")+1);
                            let buffer = new Buffer.from(result,"base64");
                            let id = uuidv4();
                            database.addMedia(id,buffer,extension).then((result) => {
                                mongoose.model('users').updateOne({username: data.user.username},
                                    {$addToSet:{
                                         media: id
                                      }},
                                   (err, result) => {if(err){console.log(err);}}
                                )
                                res.status(200).json({status:'OK', id});
                            }).catch((err) => {res.status(500).json({status:"error", error:"error adding media"});});
                        };
                   })
                }   
            });
        }
    });
});

router.get('/media/:id',(req,res) => {
      database.getMedia(req.params.id).then((result) =>{
        res.writeHead(200,{'Content-type':result.rows[0].extension});
        res.end(result.rows[0].content); 
      }).catch((err)=> {res.status(500).json({status:"error", error:"media not found"});});
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

module.exports = router;