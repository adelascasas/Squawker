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
const addDocument = (indexName,payload) => {
    elasticClient.index({
        index: indexName,
        id: uuidv4(),
        body: payload
    }).then((resp)=>{return resp;}, (err) => {return err;});
};

//Search by index
const searchbyId = (indexName,id) => {
    elasticClient.get({
        index: indexName,
        id
      }).then((resp)=>{
          console.log(resp);
        return resp;
      }, (err) => {
        return err;
      });
};

//Search by timestamp
const searchbyTime = (indexName,timestamp,limit) => {
    return elasticClient.search({
        index: indexName,
        body: {
            "query": {
                "match_all": {}
            }
        },
        size: limit
    }).then((resp)=>{
        return resp;
    }, (err) => {
        return err;
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
//addDocument('squawks',{name:"test1",timestamp: 6});
//addDocument('squawks',{name:"test2",timestamp: 7});
//addDocument('squawks',{name:"test3",timestamp: 8});
//addDocument('squawks',{name:"test4",timestamp: 9});
//addDocument('squawks',{name:"test5",timestamp: 10});
//searchbyId("squawks","dc32d2ea-056e-4513-b808-1b57c0f7f967");
//searchbyId("squawks","3886fb09-6ba1-40c4-8794-654863211c9c");
//test1: a1d43284-b35f-46d1-aa87-bd3632527df6
//test2: ab727b2b-f62e-4c11-ab34-6185c0ae962d
//test3: 2998a23a-270e-41a9-a267-38c375dda683
searchbyTime('squawks',6,2);
module.exports = {
    User,
    Blacklist,
    searchbyId,
    searchbyTime,
    addDocument
};
