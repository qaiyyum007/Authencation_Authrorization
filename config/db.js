const mongoose =require("mongoose");

const ConnectDB=async()=>{
 await mongoose.connect(process.env.MONGO_URI,{

    useCreateIndex:true,
    useFindAndModify:true,
    useUnifiedTopology:true,
    useNewUrlParser:true,
    useNewUrlParser: true
 })
   
 console.log("MongoDB connected")


}
module.exports=ConnectDB;

