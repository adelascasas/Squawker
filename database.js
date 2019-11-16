const mongoose = require('mongoose');
const elasticsearch = require('elasticsearch');
const uuidv4 = require('uuid/v4');
const cassandra = require('cassandra-driver');




mongoose.connect("mongodb://192.168.122.22/squawker",{ useNewUrlParser: true, useUnifiedTopology: true});
const db = mongoose.connection;

const casClient = new cassandra.Client({ contactPoints: ['192.168.122.27'], keyspace: 'media',localDataCenter:'datacenter1'});
casClient.connect(function (err) {
  if(err) { console.log(err);}
  else{
      console.log('connected');
  }
});
  
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

//Add media
const addMedia = (id,blob,extension) => {
    const query = 'INSERT INTO media (id, content,extension) VALUES (?, ?, ?) USING TTL ?';
    const params = [id,blob,extension,1200];
    return casClient.execute(query, params, { prepare: true });
}

//Delete media
const delMedia = (id) => {
    const query = 'DELETE FROM media WHERE id = ?';
    const param = [id];
    return casClient.execute(query,param,{prepare: true});
}

//Get media 
const getMedia = (id) => {
    const query = 'SELECT content,extension FROM media WHERE id = ?';
    return casClient.execute(query, [id],{prepare: true});
} 

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

//Increment likes for specified item
const incrementLikes = (id) => {
    return elasticClient.update({
        index: "squawks",
        id,
        body: {
            "script" : "ctx._source.property.likes++"
        }        
      });
};

//Increment retweets for specified item
const incrementretweets = (id) => {
    return elasticClient.update({
        index: "squawks",
        id,
        body: {
            "script" : "ctx._source.retweeted++"
        }        
      });
};

//Decrement likes for specified item
const decrementLikes = (id) => {
    return elasticClient.update({
        index: "squawks",
        id,
        body: {
            "script" : "if(ctx._source.property.likes > 0){ctx._source.property.likes--}"
        }        
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
const searchbyParams = (input) => {
    let params = {
        index: "squawks",
        body: {
            "query": {
                "bool": {
                    "must":[
                        {"range": {
                         "timestamp": {"lte": input.timestamp}
                        }}
                    ]
                } 
            },
            "sort": [
                {"retweeted" : "desc"},
                {"property.likes" : "desc"},
                "_score"
            ]
        },
       size: input.limit
     };
     let index;
    if(input.rank === "time"){
         params.body.sort = [];
         params.body.sort[0] = {};
         params.body.sort[0].timestamp = "desc";
    }
    if(input.usernames.length > 0){
        index = params.body.query.bool.must.length;
        params.body.query.bool.must[index] = {};
        params.body.query.bool.must[index].terms = {};
        params.body.query.bool.must[index].terms.username = input.usernames;
    }
    if(input.query){
        index = params.body.query.bool.must.length;
        params.body.query.bool.must[index] = {};
        params.body.query.bool.must[index].multi_match = {};
        params.body.query.bool.must[index].multi_match.query = input.query;
    }
    if(input.hasMedia){
        index = params.body.query.bool.must.length;
        params.body.query.bool.must[index] = {};
        params.body.query.bool.must[index].exists = {"field":"media"};
    }
    if(!input.replies){
        params.body.query.bool.must_not = [];
        params.body.query.bool.must_not[0] = {};
        params.body.query.bool.must_not[0].term = { "childType": { "value": "reply"}};
    }else{
        if(input.parent){
            index = params.body.query.bool.must.length;
            params.body.query.bool.must[index] = {};
            params.body.query.bool.must[index].term = { "parent": { "value": input.parent}};}
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
    addDocument,
    addMedia,
    getMedia,
    incrementLikes,
    decrementLikes,
    incrementretweets,
    delMedia
};
