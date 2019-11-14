const express = require('express');
const database = require('./database');
const router = express.Router();

router.post('/item/:id/like',(req,res) => {
    if (typeof req.body.like === 'undefined' || req.body.like === true){
        database.incrementLikes(req.params.id).then((result => {
            res.status(200).json({status: 'OK'});
        })).catch(err => { res.status(500).json({status: 'error'})});
    } 
    else{
        database.decrementLikes(req.params.id).then((result => {
            res.status(200).json({status: 'OK'});
        })).catch(err => { res.status(500).json({status: 'error'})});
    }
});




module.exports = router;