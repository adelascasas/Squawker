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
const deletebyId = (id) => {
    return elasticClient.delete({
        index:"squawks",
        id
      });
}

//Search by timestamp
const searchbyParams = (timestamp,limit,query,usernames) => {
    let params = {
        index: "squawks",
        body: {
            "query": {
                "bool": {
                    "must":[
                        {"range": {
                         "timestamp": {"lte": timestamp}
                        }}
                    ]
                } 
            }
        },
       size: limit
     };
    if(usernames.length > 0){
        params.body.query.bool.must[1] = {};
        params.body.query.bool.must[1].terms = {};
        params.body.query.bool.must[1].terms.username = usernames;
    }
    if(query){
        params.body.query.bool.must[2] = {};
        params.body.query.bool.must[2].multi_match = {};
        params.body.query.bool.must[2].multi_match.query = query;
    }
    return elasticClient.search(params);
};

const searchbyUsername = (indexName,limit,username) => {
    return elasticClient.search({
        index: indexName,
        body: {
            "query": {
                "term": { 
                    "username": {
                        "value": username
                    }
                }
            }
        },
       size: limit
    });
}

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
/*elasticClient.indices.delete({
    index: 'squawks',
  });*/

module.exports = {
    searchbyId,
    searchbyParams,
    searchbyUsername,
    deletebyId,
    addDocument
};
