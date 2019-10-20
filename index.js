const express = require('express');
const sendmail = require("./SendEmail.js");
const db = require("./database.js");
const uuidv4 = require('uuid/v4');
const bodyParser = require("body-parser");
const cookieParser = require('cookie-parser');
const app = express();

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(cookieParser());

app.get("/", (req,res) => {
       res.send("Hello server1");
});

app.post("/adduser",(req,res) => {
    res.send("Hello");
});

app.post("/login",(req,res) => {
    res.send("Hello");
});

app.post("/logout",(req,res) => {
    res.send("Hello");
});

app.post("/verify",(req,res) => {
    res.send("Hello");
});


app.listen(5000,"192.168.122.21");

