const mongoose = require('mongoose');
const elasticsearch = require('elasticsearch');
const uuidv4 = require('uuid/v4');


mongoose.connect("mongodb://192.168.122.22/squawker",{ useNewUrlParser: true, useUnifiedTopology: true});
const db = mongoose.connection;
let User;
let Blacklist
  
db.once('open', () => { 
    User =  mongoose.model("User",mongoose.Schema({
           _id: String,
           username: String,
           password: String,
           email:String,
           verified: Boolean, 
           key: String,
       }),"users"); 
    BlackList = mongoose.model('BlackList', mongoose.Schema({
           _id: String,
           token: String
       }),'blacklist');
    });

const elasticClient = new elasticsearch.Client({
    host: 'http://192.168.122.23:9200',
    log: 'trace'
});

//Add Document
const addDocument = (indexName,_id,docType,payload) => {
    elasticClient.index({
        index: indexName,
        id: uuidv4(),
        body: payload
    }).then((resp)=>{return resp}, (err) => {return err});
};

//Search
const search = (indexName,payload) => {
    elasticClient.search({
        index: indexName,
        body: payload
    }).then((resp)=>{
        return resp;
    }, (err) => {
        return err;
    });
};

//Check if index exists
const initIndex = (indexName) => {
    elasticClient.indices.exists({
       index: indexName
    }).then((resp)=>{
       if(!resp){
            elasticClient.indices.create({
                index: indexName
            }).then((resp)=>{return resp}, (err) => {return err});
       }
    });
}

initIndex("squawks");

module.exports = {
    User,
    Blacklist,
    search,
    addDocument
};
