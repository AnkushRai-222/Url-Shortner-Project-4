const urlModel = require("../model/urlModel")
const shortid = require('shortid');
const axios = require("axios")
const redis = require('redis')
const { promisify } = require('util')

 
//=================validation===========================//

const valid = function (value) {
    if (typeof value == "undefined" || typeof value == null) {
        return false;
    }
    if (typeof value == "string" && value.trim().length == 0) {
        return false;
    }
    return true;
  };
 
//========================[Apply redis and connect]================

const redisConnect = redis.createClient(
   14652,
   "redis-14652.c299.asia-northeast1-1.gce.cloud.redislabs.com",
   {no_ready_check: true}
);

redisConnect.auth("uMq15mB5TBzteVVvb4sAZEIhrtHbe3Sp", function(err){
    if(err) throw err;
});

redisConnect.on("connect", async function(){
    console.log("Redis is Connected...");
});


const GET_ASYNC = promisify(redisConnect.GET).bind(redisConnect);
const SET_ASYNC = promisify(redisConnect.SETEX).bind(redisConnect);



//========================[Function for Create Shorten URL]==========================//

const urlShort = async (req, res) => {
    //console.log(req)
    try{
        let data = req.body
        let {longUrl} = data
    if (Object.keys(data).length==0) return res.status(400).send({status:false, msg:"Body can't be empty"})
    
    if(!longUrl) return res.status(400).send({status:false, msg:"longUrl is required"})
    if(!valid(longUrl)) return res.status(400).send({status:false, msg:"We cannot enter empty string"})

    let option = {
        method: 'get',
        url: longUrl
    }
    let validateUrl = await axios(option)
        .then(() => longUrl)    
        .catch(() => null)      

    if (!validateUrl) { return res.status(400).send({ status: false, message: `This Link: ${longUrl} is not Valid URL.` }) }

    
    let shortUrlId = shortid.generate().toLowerCase();
    let baseUrl = "http://localhost:3000/"
    let obj = {
    "urlCode": shortUrlId,
    "longUrl": longUrl,
    "shortUrl": baseUrl+shortUrlId
    }
     
    let findData = await urlModel.findOne({longUrl: longUrl}).select({_id: 0, __v:0})
    if (findData) return res.status(200).send({status:true, msg:findData})
    let final = await urlModel.create(obj);
    res.status(201).send({status: true, msg: obj})
    
    }catch(err){
        return res.status(500).send({status:false,message:err.message})
    }
}

//==============================[Function to Fetch the URL Data from DB]=========================================//

let getData = async (req, res) => {
    try{
        let cahcedProfileData = await GET_ASYNC(`${req.params.urlCode}`)
    
if(cahcedProfileData) {
   let txt =  JSON.parse(cahcedProfileData)
    res.status(302).redirect(txt.longUrl)
  } else{

        let urlCode = req.params.urlCode
    if(!shortid.isValid(urlCode)) return res.status(400).send({status: false, msg: "Please provide a valid URL code"}) 

    let findLongUrl = await urlModel.findOne({urlCode: urlCode});
    if (!findLongUrl) return res.status(404).send({status: false, msg: "Url code not found"})

    await SET_ASYNC(`${req.params.urlCode}`,24*60*60, JSON.stringify(findLongUrl))
    res.status(302).redirect(findLongUrl.longUrl)
  }
    }catch(err){
        return res.status(500).send({status:false,message:err.message})
    }

}



module.exports = {urlShort, getData}