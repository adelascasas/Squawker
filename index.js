const express = require('express');
const app = express();

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

