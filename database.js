const mongoose = require('mongoose');
const elasticsearch = require('elasticsearch');
const uuidv4 = require('uuid/v4');


mongoose.connect("mongodb://192.168.122.22/squawker",{ useNewUrlParser: true, useUnifiedTopology: true});
const db = mongoose.connection;
  
db.once('open', () => { 
    mongoose.model("users",mongoose.Schema({
           _id: String,
           username: String,
           password: String,
           email:String,
           verified: Boolean, 
           key: String,
           followers: [{ type: String}],
           following: [ { type: String}]
       }),"users"); 
    mongoose.model('blacklist', mongoose.Schema({
           _id: String,
           token: String
       }),'blacklist');
    });

const elasticClient = new elasticsearch.Client({
    host: 'http://192.168.122.23:9200',
    log: 'trace'
});

//Add Document
const addDocument = (indexName,payload) => {
    return elasticClient.index({
        index: indexName,
        id: uuidv4(),
        body: payload
    });
};

//Search by index
const searchbyId = (indexName,id) => {
    return elasticClient.get({
        index: indexName,
        id
      });
};

//Delete document with given id
const deletebyId = (indexName,id) => {
    return elasticClient.delete({
        index,
        id
      });
}

//Search by timestamp
const searchbyTime = (indexName,timestamp,limit) => {
    return elasticClient.search({
        index: indexName,
        body: {
            "query": {
                "range": {
                    "timestamp": {
                        "lte": timestamp
                    }
                }
            }
        },
       size: limit
    });
};

//init index if necessary
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
//elasticClient.indices.delete({
//    index: 'squawks',
//  });

module.exports = {
    searchbyId,
    searchbyTime,
    deletebyId,
    addDocument
};
