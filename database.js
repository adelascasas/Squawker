const mongoose = require('mongoose');
const elasticsearch = require('elasticsearch');

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

//initialize index
const initIndex = (indexName) => {
    elasticClient.indices.create({
        index: indexName
    }).then((resp)=>{return resp}, (err) => {return err});
};

//prepare index and mapping
const initMapping = (indexName, docType,payload) => {
    elasticClient.indices.putMapping({
        index: indexName,
        type: docType,
        body: payload
    }).then((resp)=>{return resp}, (err) => {return err});
};

//Add Document
const addDocument = (indexName,_id,docType,payload) => {
    elasticClient.index({
        index: indexName,
        type: docType,
        id: _id,
        body: payload
    }).then((resp)=>{return resp}, (err) => {return err});
};

//Search
const search = (indexName,docType,payload) => {
    elasticClient.search({
        index: indexName,
        type: docType,
        body: payload
    }).then((resp)=>{
        console.log(resp);
        return resp
    }, (err) => {
        console.log(err);
        return err
    });
};

//Check if index exists
const indexExists = (indexName) => {
    elasticClient.indices.exists({
       index: indexName
    }).then((resp)=>{return resp}, (err) => {return err});
}




module.exports = {
    User,
    Blacklist,
    search,
    addDocument
};
