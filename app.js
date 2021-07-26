require('dotenv').config()
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const findOrCreate = require("mongoose-findorcreate");
//google
const GoogleStrategy = require('passport-google-oauth20').Strategy;
//facebook
const FacebookStrategy = require('passport-facebook').Strategy;


const app = express();

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false});

mongoose.set('useCreateIndex', true);

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    wisp: String,
    //google
    googleId: String,
    //facebook
    facebookId: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
});
  
passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});

//google
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/wisp"
  },
  function(accessToken, refreshToken, profile, cb) {
      //console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
));
//facebook
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/wisp"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res){
    res.render("home");
});

//google
app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get("/auth/google/wisp", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to wisps.
    res.redirect("/wisps");
    }
);

//facebook
app.get("/auth/facebook",
  passport.authenticate("facebook")
);

app.get("/auth/facebook/wisp",
  passport.authenticate("facebook", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/wisps");
  }
);


app.get("/register", function(req, res){
    res.render("register");
});

app.get("/wisps", function(req, res){
    if(req.isAuthenticated()){
        User.find({wisp: {$ne: null}}, function(err, foundArray){
            if(err){
                console.log(err);
            } else {
                res.render("wisps", {wispsArray: foundArray});
            }
        })
    } else {
        res.redirect("/login");
    }
});

app.get("/login", function(req, res){
    res.render("login");
});

app.get("/logout", function(req, res){
    req.logout();
    res.redirect("/");
});

app.get("/submit", function(req, res){
    if(req.isAuthenticated()){
        res.render("submit");
    } else {
        res.redirect("/login");
    }
});

app.post("/register", function(req, res){
    User.register({username: req.body.username}, req.body.password, function(err, newUser){
        if(err){
            console.log(err);
            res.redirect("/register");
        } else {
            //console.log("user created");
            console.log(newUser);
            passport.authenticate("local")(req, res, function(){
                //console.log("authentication successful");
                res.redirect("/wisps");
            });
        }
    })
});

app.post("/login", function(req, res){
    const user = new User({
        email: req.body.username,
        password: req.body.password
    });
    req.login(user, function(err){
        if(err){
            console.log(err);
        } else {
            //console.log("user exists");
            passport.authenticate("local")(req, res, function(){
                //console.log("authentication successful");
                res.redirect("/wisps");
            });
        }
    });
});

app.post("/submit", function(req, res){
    const submittedWisp = req.body.wisp;
    //find the user submitting
    User.findOne({_id: req.user.id}, function(err, foundObject){
        if(err){
            console.log(err);
        } else {
            foundObject.wisp = submittedWisp;
            foundObject.save(function(){
                res.redirect("/wisps");
                //console.log(foundObject.wisp);
            });
        }
    });
});

let port = 3000;
app.listen(port, function(){
    console.log(`Listening on port ${port}`);
});