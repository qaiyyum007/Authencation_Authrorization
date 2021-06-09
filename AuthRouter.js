const express = require('express')
const exressRouter = express.Router()
const User = require('./Model/User')
const jwt = require('jsonwebtoken');
const sgMail = require('@sendgrid/mail');
const bcrypt = require('bcrypt')
const auth =require('./middleware/auth')
const authAdmin=require('./middleware/AdminAuth')

sgMail.setApiKey(process.env.MAIL_KEY);
const {
  validRegister,
  validLogin,
  forgotPasswordValidator,
  resetPasswordValidator
} = require('./validation')

class AuthRouter {
  dataRouter
  constructor() {
    this.dataRouter = exressRouter;
    this.dataRouter.post('/register',validRegister, async (req, res) => {

      try {
        const {name, email, password} = req.body
        
        if(!name || !email || !password)
            return res.status(400).json({msg: "Please fill in all fields."})

        if(!validateEmail(email))
            return res.status(400).json({msg: "Invalid emails."})

        const user = await User.findOne({email})
        if(user) return res.status(400).json({msg: "This email already exists."})

        if(password.length < 6)
            return res.status(400).json({msg: "Password must be at least 6 characters."})

        const passwordHash = await bcrypt.hash(password, 12)

        const newUser = {
            name, email, password: passwordHash
        }

        const activation_token = createActivationToken(newUser)

        const emailData = {
          from: process.env.EMAIL_FROM,
          to: process.env.EMAIL_TO,
          subject: 'Account activation link',

          html: `
                      <h1>Please use the following to activate your account</h1>
                     <p>${process.env.CLIENT_URL}/users/activate/${activation_token}</p>
                     <hr />
                       <p>This email may containe sensetive information</p>
                     <p>${process.env.CLIENT_URL}</p>
            `
        };
         await sgMail.send(emailData, "Verify your email address")


        res.json({msg: "Register Success! Please activate your email to start."})
    } catch (err) {
        return res.status(500).json({msg: err.message})
    }
  
    })



    this.dataRouter.post('/activate',   async (req, res) => {

      try {
        const {activation_token} = req.body
        const user = jwt.verify(activation_token, process.env.ACTIVATION_TOKEN_SECRET)

        const {name, email, password} = user

        const check = await User.findOne({email})
        if(check) return res.status(400).json({msg:"This email already exists."})

        const newUser = new User({
            name, email, password
        })

        await newUser.save()

        res.json({msg: "Account has been activated!"})

    } catch (err) {
        return res.status(500).json({msg: err.message})
    }
    })

    this.dataRouter.post('/login', validLogin,async (req, res) => {

      try {
        const {email, password} = req.body
        const user = await User.findOne({email})
        if(!user) return res.status(400).json({msg: "This email does not exist."})

        const isMatch = await bcrypt.compareSync(password, user.password)
        console.log(user.password)
        console.log(password)
        if(!isMatch) return res.status(400).json({msg: "Password is incorrect."})

        const refresh_token = createRefreshToken({id: user._id})
            res.cookie('refreshtoken', refresh_token, {
                httpOnly: true,
                path: '/',
                maxAge: 7*24*60*60*1000 // 7 days
            })

            res.json({msg: "Login success!"})
        }
        catch (err) {
        return res.status(500).json({msg: err.message})
    }
    })


    this.dataRouter.post('/token',async (req, res) => {

      try {
        const rf_token = req.cookies.refreshtoken;

        console.log(rf_token)
        if(!rf_token) return res.status(400).json({msg: "Please login now!"})

        jwt.verify(rf_token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
            if(err) return res.status(400).json({msg: "Please login now!"})

            const access_token = createAccessToken({id: user.id})
            res.json({access_token})
        })
    } catch (err) {
        return res.status(500).json({msg: err.message})
    }
},)



  
this.dataRouter.post('/forgetPassword',forgotPasswordValidator,async (req, res) => {
  try {
    const {email} = req.body
    const user = await User.findOne({email})
    if(!user) return res.status(400).json({msg: "This email does not exist."})

    const access_token = createAccessToken({id: user._id})
     
    const emailData = {
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_TO,
      subject: 'Account Reset link',

      html: `
                  <h1>Please use the following to activate your account</h1>
                 <p>${process.env.CLIENT_URL}/user/reset/${access_token}</p>
                 <hr />
                   <p>This email may containe sensetive information</p>
                 <p>${process.env.CLIENT_URL}</p>
        `
    };
    await sgMail.send(emailData, "Reset your password")
    res.json({msg: "Re-send the password, please check your email."})
} catch (err) {
    return res.status(500).json({msg: err.message})
}
  
          
})

this.dataRouter.post('/reset',auth,resetPasswordValidator,async (req, res) => {

  try {
    const {password} = req.body
    console.log(password)
    const passwordHash = await bcrypt.hash(password, 12)

    await User.findOneAndUpdate({_id: req.user.id}, {
        password: passwordHash
    })

    res.json({msg: "Password successfully changed!"})
} catch (err) {
    return res.status(500).json({msg: err.message})
}
},)


this.dataRouter.get('/userInfor',auth,async (req, res) => {

  try {
    const user = await User.findById(req.user.id).select('-password')

    res.json(user)
} catch (err) {
    return res.status(500).json({msg: err.message})
}
},)



this.dataRouter.get('/userAllInfor',auth,authAdmin,async (req, res) => {

  try {
    const user = await User.find().select('-password')

    res.json(user)
} catch (err) {
    return res.status(500).json({msg: err.message})
}
},)

this.dataRouter.get('/logout',auth,async (req, res) => {

  try {
    res.clearCookie('refreshtoken', {path: '/user/refresh_token'})
    return res.json({msg: "Logged out."})
} catch (err) {
    return res.status(500).json({msg: err.message})
}
},)

this.dataRouter.patch('/userUpdate',auth,async (req, res) => {

  try {
    const {name, avatar} = req.body
    await User.findOneAndUpdate({_id: req.user.id}, {
        name, avatar
    })

    res.json({msg: "Update Success!"})
} catch (err) {
    return res.status(500).json({msg: err.message})
}
},)


this.dataRouter.patch('/userUpdate',auth,async (req, res) => {

  try {
    const {role} = req.body

    await Users.findOneAndUpdate({_id: req.params.id}, {
        role
    })

    res.json({msg: "Update Success!"})
} catch (err) {
    return res.status(500).json({msg: err.message})
}
},)

this.dataRouter.patch('/updateRole',auth,authAdmin,async (req, res) => {

  try {
    const {role} = req.body

    await Users.findOneAndUpdate({_id: req.params.id}, {
        role
    })

    res.json({msg: "Update Success!"})
} catch (err) {
    return res.status(500).json({msg: err.message})
}
},)

this.dataRouter.delete('/deleteUser',auth,authAdmin,async (req, res) => {

  try {
    await User.findByIdAndDelete(req.params.id)

    res.json({msg: "Deleted Success!"})
} catch (err) {
    return res.status(500).json({msg: err.message})
}
},)
   

    const createActivationToken = (payload) => {
      return jwt.sign(payload, process.env.ACTIVATION_TOKEN_SECRET, {expiresIn: '50m'})
  }
 
  const createAccessToken = (payload) => {
    return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '50m'})
}

const createRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '7d'})
}

function validateEmail(email) {
  const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
}
}
  }






module.exports = AuthRouter