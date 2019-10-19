const mongoose = require('mongoose');
mongoose.connect("mongodb://127.0.0.1:27017/squawker",{ useNewUrlParser: true, useUnifiedTopology: true});

const db = mongoose.connection;
const User;

db.once('open', () => { 
    User =  mongoose.model("User",mongoose.Schema({
           _id: String,
           username: String,
           password: String,
           email:String,
           verified: Boolean,
           key: String,
       }),"users"); 
    });