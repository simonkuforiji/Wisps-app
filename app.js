require('dotenv').config()
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
//const encrypt = require("mongoose-encryption");
//const md5 = require("md5");
const bcrypt = require("bcrypt");
const saltRounds = 10;

const app = express();

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false});

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

//userSchema.plugin(encrypt, {secret: process.env.SECRETTEXT, encryptedFields: ["password"]});

const User = new mongoose.model("User", userSchema);

app.get("/", function(req, res){
    res.render("home");
});

app.get("/register", function(req, res){
    res.render("register");
});

app.get("/login", function(req, res){
    res.render("login");
});

app.post("/register", function(req, res){
    const username = req.body.username;
    const userPassword = req.body.password;

    User.findOne({email: username}, function(err, foundObject){
        if(!err){
            if(!foundObject){
                bcrypt.hash(userPassword, saltRounds, function(err, hash) {
                    const newUser = new User({
                        email: username,
                        password: hash
                    });
                    newUser.save();
                    res.render("secrets");
                });
            } else{
                console.log("user already exists");
                res.redirect("/");
            }
        } else{
            console.log(err);
        }
    });
});

app.post("/login", function(req, res){
    const username = req.body.username;
    const userPassword = req.body.password;

    User.findOne({email: username}, function(err, foundObject){
        if(!err){
            bcrypt.compare(userPassword, foundObject.password, function(err, result) {
                if(result){
                    res.render("secrets");
                } else{
                    console.log("wrong password");
                    res.redirect("/login");
                }
            });
        } else{
            console.log(err);
        }
    });
});


let port = 3000;
app.listen(port, function(){
    console.log(`Listening on port ${port}`);
});