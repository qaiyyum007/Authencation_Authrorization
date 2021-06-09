require("dotenv").config({ path: "./config.env" });

const express =require('express');

const morgan =require('morgan') ;


const cookieParser = require('cookie-parser');

const connectDB =require ('./config/db');

const AuthRouter =require ('./AuthRouter');
// const UploadFile = require("./UploadRouter");

// convert in to app
const app=express()
// support parsing of application/json type post data
// ody-parser is a piece of express middleware that reads a form's input and stores it as a javascript object accessible through req.body
app.use(express.json())
app.use(cookieParser())

app.use(morgan('tiny'));


// connect DB
connectDB();









const PORT=process.env.PORT||9999;

app.listen(PORT,()=>{
    console.log(`server is runing on ${PORT}`)
})


app.use('/', new AuthRouter().dataRouter )
