const express = require('express');
const database = require('./database');
const router = express.Router();
const mongoose = require('mongoose');
const jwt = require("jsonwebtoken");



router.post('/item/:id/like',verifyToken,(req,res) => {
    mongoose.model('blacklist').findOne({token: req.token}).exec().then((doc) => {
        if(doc){
             res.status(500).json({status: 'error', error: "you have been logged out"}); 
        }
        else{
                jwt.verify(req.token, 'MySecretKey',(err, data)=>{
                    if(err) {
                        res.status(500).json({status:'error', error:"error verifying key"});}
                    else{
                        if (typeof req.body.like === 'undefined' || req.body.like === true){
                            database.incrementLikes(req.params.id,data.user.username).then((result => {
                                res.status(200).json({status: 'OK'});
                            })).catch(err => { res.status(500).json({status: 'error'})});
                        } 
                        else{
                            database.decrementLikes(req.params.id,data.user.username).then((result => {
                                res.status(200).json({status: 'OK'});
                            })).catch(err => { res.status(500).json({status: 'error'})});
                        }
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




module.exports = router;