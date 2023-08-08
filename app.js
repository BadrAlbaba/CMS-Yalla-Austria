require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const path = require("path");
const rootDir = require("./util/path");
const mongoose = require('mongoose');
const multer  = require('multer');
const Cors = require("cors");
const Blog = require('./models/blog');
const _ = require("lodash");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const csrf = require("csurf");
const nodemailer = require("nodemailer");
const sendGridTransport = require("nodemailer-sendgrid-transport");
const crypto = require("crypto");
const transporter = nodemailer.createTransport(sendGridTransport({
    auth:{
        api_key:process.env.API_KEY
    }
}));


const MongoDBStore = require("connect-mongodb-session")(session);
const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null , "images");
    },
    filename:(req, file, cb) => {
        cb (null, file.originalname);
    }
});
const fileFilter =(req, file, cb) => {
    if(file.mimetype === "image/png" || file.mimetype === "image/jpg" || file.mimetype === "image/jpeg" ){
        cb(null, true);
    } else{
        cb(null, false);
    }
};

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true,
});


const app = express();
const store = new MongoDBStore({
    uri: process.env.MONGODB_URI,
    collection: "session",
});

const csrfProtection = csrf();


app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(multer({storage: fileStorage, fileFilter: fileFilter}).single('image'));
app.use(express.static("public"));
app.use("/images",express.static("images"));


app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false,
    store: store
  }));

app.use(csrfProtection);
app.use(Cors());

// User Schema

const userSchema = new mongoose.Schema({
    userName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        required: true
    },
    resetToken : String,
    resetTokenExpiration: Date
},{timestamps: true});

const User = mongoose.model("User",userSchema);


// Topics Schema
const firstTopicSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        required: true
    },
    author:{
        type: String,
        required: true
    },
    updatedBy:{
        type: String,
    },
    createdAt:{
        type: String,
        required: true
    },
    updatedAt:{
        type: String,
    }
});

const FirstTopic = mongoose.model("FirstTopic",firstTopicSchema);


const secoundTopicSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        required: true
    },
    fsTopic: {
        type: mongoose.ObjectId,
        ref: "MainTopic",
        required: true
    },
    author:{
        type: String,
        required: true
    },
    updatedBy:{
        type: String,
    },
    createdAt:{
        type: String,
        required: true
    },
    updatedAt:{
        type: String,
    }
});

const SecoundTopic = mongoose.model("SecoundTopic",secoundTopicSchema);

const thirdTopicSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        required: true
    },
    scTopic: {
        type: mongoose.ObjectId,
        ref: "SecoundTopic",
        required: true
    },
    author:{
        type: String,
        required: true
    },
    updatedBy:{
        type: String,
    },
    createdAt:{
        type: String,
        required: true
    },
    updatedAt:{
        type: String,
    }
});

const ThirdTopic = mongoose.model("ThirdTopic",thirdTopicSchema);

// Posts Schema

const postSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        unique: true
    },
    body: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    postTopic: {
        type: mongoose.ObjectId,
        ref: "ThirdTopic",
        required: true
    },
    author:{
        type: String,
        required: true
    },
    updatedBy:{
        type: String,
    },
    createdAt:{
        type: String,
        required: true
    },
    updatedAt:{
        type: String,
    }
});

// postSchema.index({ title: 'text', body: 'text'});


const Post = mongoose.model("Post",postSchema);

app.use((req,res,next)=>{
    res.locals.isAuthenticated = req.session.isLoggedIn;
    res.locals.csrfToken = req.csrfToken();
    res.locals.isAdmin = req.session.isAdmin;
    next();
});

// Home route


app.get("/" ,(req,res) => {
    Post.find({},(err,result) => {
        res.render("home",{
            title: "Home",
            page:"home",
            posts:result,
            metaTitle:"Yalla Austria | Home",
            metaDescription:"Yalla Austria is an online platform to help students to study in Austria. We share with you any new information about studying in Austria.",
            metaImage:""
            //search: search
        });
    });
    
    // Post.find( { $text: { $search: "badr Lorem", $diacriticSensitive: true  } },(err,search)=>{
    //    if(err){
    //        console.log(err);
    //    } else{
    //        console.log(search); 
   //     }
   // });  
});


app.get("/autocomplete",(req,res)=>{
    Post.find({},(err,result) => {
        var postsArray = [];
        result.forEach(post => {
            postsArray.push(post.title);
        });
        res.jsonp(postsArray);
    });
});

// login route

app.get("/admin/login", (req,res) => {
    if(req.session.isLoggedIn){
        res.redirect("/admin/my-account");
    } else{
        res.render("login");
    }

});

app.post("/admin/login", (req,res) => {
    User.findOne({email:req.body.email}, (err, user) =>{
        bcrypt.compare(req.body.password, user.password, function(err, result) {
            if(result){
                req.session.isLoggedIn= true;
                req.session.user = user;
                if(user.role === "admin"){
                    req.session.isAdmin= true;
                }
                res.redirect("/admin/manage-post");
            } else{
                res.redirect("/admin/login");
            }
        });     
    });
});

// logout route

app.post("/admin/logout", (req,res) => {
    if(req.session.isLoggedIn){
        req.session.destroy(err => {
            if(err){
                console.log(err);
            } else{
                res.redirect("/admin/login");
            }  
        });
    }  
});

// admin/my-acount route

app.get("/admin/my-account", (req,res) =>{
    if(req.session.isLoggedIn){
        User.findById({_id:req.session.user._id},(err,user) => {
            res.render("my-account",{
                name: user.userName,
                email: user.email
            });
        }); 
    }
});

// admin/add-user route

app.get("/admin/add-user", (req,res) =>{
    if(req.session.isLoggedIn){
        if(req.session.isAdmin){
            res.render("add",{
                button: "User",
                header: "Add User",
                firstInput: "User Name",
                firstinputName:"userName",
                page: "user"
            });
        } 
    }
});

app.post("/admin/add-user", (req,res) => {
    if(req.session.isLoggedIn){
        if(req.session.isAdmin){
            User.findOne({email:req.body.email},(err,user)=>{
                if(!user){
                    bcrypt.hash(req.body.password, 12,(err, hash) => {
                        const user = new User({
                            userName:req.body.userName,
                            email:req.body.email,
                            password:hash,
                            role:req.body.role,
                        });
                        user.save(err => {
                            if(err){
                                console.log(err);
                            } else{
                                res.redirect("/admin/manage-user");
                                transporter.sendMail({
                                    to: req.body.email,
                                    from: "oesterbidlung@gmail.com",
                                    subject: "You are added!",
                                    html: "<h1>You succsesfully added to Study In Austria!</h1>"
                                });
                            }
                        });
                    });
                } else {
                    res.send("<h1>User is already exist</h1>");
                }
            });
        }
    } 
});

// admin/add-post route

app.get("/admin/add-post", (req,res) =>{
    if(req.session.isLoggedIn){
        ThirdTopic.find({},(err,posts) => {
            res.render("add",{
                button: "Post",
                header: "Add Post",
                firstInput: "Title",
                firstinputName:"postTitle",
                secoundInput: "Body",
                secoundInputName: "postBody",
                topics: posts,
                page: "post"
            });
        });
    }
});

app.post("/admin/add-post", (req,res) =>{
    if(req.session.isLoggedIn){
        const image = req.file;
        const imageUrl = image.path;
        
        if(!image){
            res.send("<h1>Post not added! There isn't any file that has been uploaded!</h1>")
        }
        else{
            const date = Date().split(" ",4);
            const finalDate = date[1]+ "/" + date[2]+  "/" + date[3];
            const postTitle = req.body.postTitle;
            
            const post = new Post({
                title:postTitle.trim(),
                body:req.body.postBody,
                image: imageUrl,
                postTopic: req.body.postTopic,
                author: req.session.user.userName,
                createdAt: finalDate,
            });
            post.save( err => {
                res.redirect("/admin/manage-post");
            });
        }
    }
    
});

// admin/add-first-topic route

app.get("/admin/add-first-topic", (req,res) =>{
    if(req.session.isLoggedIn){
        res.render("add",{
            button: "First Topic",
            header: "Add First Topic",
            firstInput: "Name",
            firstinputName:"topicName",
            secoundInput: "Description",
            secoundInputName: "topicDescription",
            page: "first-topic"
        });                
    }
});

app.post("/admin/add-first-topic", (req,res) => {
    if(req.session.isLoggedIn){
        const date = Date().split(" ",4);
        const finalDate = date[1]+ "/" + date[2]+  "/" + date[3];
        const topicName = req.body.topicName;

        const topic = new FirstTopic({
            name:topicName.trim(),
            description:req.body.topicDescription,
            author:req.session.user.userName,
            createdAt: finalDate,
        });
        topic.save(err => {
            res.redirect("/admin/manage-first-topic");
        }); 
    }
});


// admin/add-secound-topic route

app.get("/admin/add-secound-topic", (req,res) =>{
    if(req.session.isLoggedIn){
        FirstTopic.find({},(err,result)=>{
            if(!err){
                res.render("add",{
                    button: "Secound Topic",
                    header: "Add Secound Topic",
                    firstInput: "Name",
                    firstinputName:"topicName",
                    secoundInput: "Description",
                    secoundInputName: "topicDescription",
                    mainTopics:result,
                    page: "secound-topic"
                });
            } else {
                console.log(err);
            }
        });
    }
});

app.post("/admin/add-secound-topic", (req,res) => {
    if(req.session.isLoggedIn){
        const date = Date().split(" ",4);
        const finalDate = date[1]+ "/" + date[2]+  "/" + date[3];
        const topicName = req.body.topicName;
        
        const topic = new SecoundTopic({
            name:topicName.trim(),
            description:req.body.topicDescription,
            author:req.session.user.userName,
            fsTopic:req.body.mainTopic,
            createdAt: finalDate,
        });
        topic.save(err => {
            res.redirect("/admin/manage-secound-topic");
        }); 
    }
});

// admin/add-secound-topic route

app.get("/admin/add-third-topic", (req,res) =>{
    if(req.session.isLoggedIn){
        SecoundTopic.find({},(err,result)=>{
            if(!err){
                res.render("add",{
                    button: "Third Topic",
                    header: "Add Third Topic",
                    firstInput: "Name",
                    firstinputName:"topicName",
                    secoundInput: "Description",
                    secoundInputName: "topicDescription",
                    mainTopics:result,
                    page: "third-topic"
                });
            } else {
                console.log(err);
            }
        });
    }
});

app.post("/admin/add-third-topic", (req,res) => {
    if(req.session.isLoggedIn){
        const date = Date().split(" ",4);
        const finalDate = date[1]+ "/" + date[2]+  "/" + date[3];
        const topicName = req.body.topicName;

        const topic = new ThirdTopic({
            name:topicName.trim(),
            description:req.body.topicDescription,
            author:req.session.user.userName,
            scTopic:req.body.mainTopic,
            createdAt: finalDate,
        });
        topic.save(err => {
            res.redirect("/admin/manage-third-topic");
        }); 
    }
});

// admin/manage-post route

app.get("/admin/manage-post", (req,res) =>{
    if(req.session.isLoggedIn){
        Post.find({},(err,posts) => {
            res.render("manage",{
                button: "Post",
                header: "Manage Post",
                firstTh: "Title",
                secoundTh: "Author",
                posts:posts,
                user:posts.author,
                id:1,
                page: "post"
            });
        });
    }
});

app.post("/admin/manage-post", (req,res)=>{
    if(req.session.isLoggedIn){
        Post.findByIdAndRemove({_id: req.body.postTitleButton},(err)=>{
            if(err){
                console.log(err);
            } else{
                res.redirect("/admin/manage-post");
            }
        });
    }
});

// admin/manage-first-topic route

app.get("/admin/manage-first-topic", (req,res) =>{
    if(req.session.isLoggedIn){
        FirstTopic.find({},(err,result) => {
            res.render("manage",{
                button: "First Topic",
                header: "Manage First Topic",
                firstTh: "Name",
                secoundTh: "Author",
                topics:result,
                id:1,
                page: "first-topic"
            });
        });
    }
});

app.post("/admin/manage-first-topic", (req,res)=>{
    if(req.session.isLoggedIn){
        FirstTopic.findByIdAndRemove({_id: req.body.topicNameButton},(err)=>{
            if(err){
                console.log(err);
            } else{
                res.redirect("/admin/manage-first-topic");  
            } 
        });
    }  
});

// admin/manage-secound-topic route

app.get("/admin/manage-secound-topic", (req,res) =>{
    if(req.session.isLoggedIn){
        SecoundTopic.find({},(err,result) => {
            res.render("manage",{
                button: "Secound Topic",
                header: "Manage Seocund Topic",
                firstTh: "Name",
                secoundTh: "Author",
                topics:result,
                id:1,
                page: "secound-topic"
            });
        });
    }
});

app.post("/admin/manage-secound-topic", (req,res)=>{
    if(req.session.isLoggedIn){
        SecoundTopic.findByIdAndRemove({_id: req.body.topicNameButton},(err)=>{
            if(err){
                console.log(err);
            } else{
                res.redirect("/admin/manage-secound-topic");  
            } 
        });
    }  
});

// admin/manage-secound-topic route

app.get("/admin/manage-third-topic", (req,res) =>{
    if(req.session.isLoggedIn){
        ThirdTopic.find({},(err,result) => {
            res.render("manage",{
                button: "Third Topic",
                header: "Manage Third Topic",
                firstTh: "Name",
                secoundTh: "Author",
                topics:result,
                id:1,
                page: "third-topic"
            });
        });
    }
});

app.post("/admin/manage-third-topic", (req,res)=>{
    if(req.session.isLoggedIn){
        ThirdTopic.findByIdAndRemove({_id: req.body.topicNameButton},(err)=>{
            if(err){
                console.log(err);
            } else{
                res.redirect("/admin/manage-third-topic");  
            } 
        });
    }  
});

// admin/manage-user route

app.get("/admin/manage-user", (req,res) =>{
    if(req.session.isLoggedIn){
        if(req.session.isAdmin){
            User.find({},(err, users) =>{
                res.render("manage",{
                    button: "User",
                    header: "Manage User",
                    firstTh: "User Name",
                    secoundTh: "Role",
                    users:users,
                    id:1,
                    page: "user"
                });
            });
        } 
    }
});

app.post("/admin/manage-user", (req,res)=>{
    if(req.session.isLoggedIn){
        if(req.session.isAdmin){
            User.findByIdAndRemove({_id: req.body.userId},(err)=>{
                if(err){
                    console.log(err);
                } else{
                    res.redirect("/admin/manage-user");  
                } 
            });
        }
    } 
});

// admin/edit-post route

app.get("/admin/edit-post/:id", (req,res) =>{
    if(req.session.isLoggedIn){
        const id = req.params.id;
        Post.findOne({_id:id},(err,post) =>{
            ThirdTopic.find({},(err,topics) => {
                res.render("edit",{
                    header: "Edit Post",
                    button: "Post",
                    firstInput: "Title",
                    firstinputName:"postTitle",
                    secoundInput: "Body",
                    secoundInputName: "postBody",
                    frInputValue: post.title,
                    scInputValue: post.body,
                    inputsValue:post,
                    topics:topics,
                    page: "post"
                });
            });
        });
    }
});

app.post("/admin/edit-post/:id",(req,res) => {
    if(req.session.isLoggedIn){
        const date = Date().split(" ",4);
        const finalDate = date[1]+ "/" + date[2]+  "/" + date[3];
        const id = req.params.id;
        const image = req.file;
        const postTopic = req.body.postTopic;
        const postTitle = req.body.postTitle

        if(!image && !postTopic){
            Post.findByIdAndUpdate({_id:id},{title : req.body.postTitle, body: req.body.postBody, updatedBy:req.session.user.userName, updatedAt: finalDate}, (err,result) =>{
                if(!err){
                    res.redirect("/admin/manage-post");
                } else {
                    console.log(err);
                }
            });
        } else if(image && postTopic) {
            const img = image.path;
            Post.findByIdAndUpdate({_id:id},{title : req.body.postTitle, body: req.body.postBody, postTopic:postTopic, image: img, updatedBy:req.session.user.userName, updatedAt: finalDate}, (err,result) =>{
                if(!err){
                    res.redirect("/admin/manage-post");
                } else {
                    console.log(err);
                }
            });
        } else if(!image) {
            Post.findByIdAndUpdate({_id:id},{title : req.body.postTitle, body: req.body.postBody, postTopic:postTopic, updatedBy:req.session.user.userName, updatedAt: finalDate}, (err,result) =>{
                if(!err){
                    res.redirect("/admin/manage-post");
                } else {
                    console.log(err);
                }
            });
        } else if(!postTopic) {
            const img = image.path;
            Post.findByIdAndUpdate({_id:id},{title : req.body.postTitle, body: req.body.postBody, image: img, updatedBy:req.session.user.userName, updatedAt: finalDate}, (err,result) =>{
                if(!err){
                    res.redirect("/admin/manage-post");
                } else {
                    console.log(err);
                }
            });
        }
    }
});

// admin/edit-first-topic route

app.get("/admin/edit-first-topic/:id", (req,res) =>{
    if(req.session.isLoggedIn){
        const id = req.params.id;
        FirstTopic.findOne({_id:id},(err,topic) =>{
            res.render("edit",{
                button: "First Topic",
                header: "Add First Topic",
                firstInput: "Name",
                firstinputName:"topicName",
                secoundInput: "Description",
                secoundInputName: "topicDescription",
                frInputValue:topic.name,
                scInputValue:topic.description,
                inputsValue:topic,
                page: "first-topic"
                });
        });
    }

});

app.post("/admin/edit-first-topic/:id",(req,res) => {
    if(req.session.isLoggedIn){
        const date = Date().split(" ",4);
        const finalDate = date[1]+ "/" + date[2]+  "/" + date[3];
        const id = req.params.id;
        const topicName = req.body.topicName;

        FirstTopic.findByIdAndUpdate({_id:id},{name : topicName.trim(), description: req.body.topicDescription, updatedBy:req.session.user.userName, updatedAt: finalDate}, (err,result) =>{
            if(!err){
                res.redirect("/admin/manage-first-topic");
            } else {
                console.log(err);
            }
        });
    }
    
});

// admin/edit-secoud-topic route

app.get("/admin/edit-secound-topic/:id", (req,res) =>{
    if(req.session.isLoggedIn){
        const id = req.params.id;
        SecoundTopic.findOne({_id:id},(err,topic) =>{
            FirstTopic.find({},(err,firstTopics)=>{
                res.render("edit",{
                    button: "Secound Topic",
                    header: "Add FiSecoundrst Topic",
                    firstInput: "Name",
                    firstinputName:"topicName",
                    secoundInput: "Description",
                    secoundInputName: "topicDescription",
                    frInputValue:topic.name,
                    scInputValue:topic.description,
                    inputsValue:topic,
                    mainTopics:firstTopics,
                    page: "secound-topic"
                });
            });
        });
    }

});

app.post("/admin/edit-secound-topic/:id",(req,res) => {
    if(req.session.isLoggedIn){
        const date = Date().split(" ",4);
        const finalDate = date[1]+ "/" + date[2]+  "/" + date[3];
        const id = req.params.id;
        const mainTopic = req.body.mainTopic;
        const topicName = req.body.topicName;
        
        if(!mainTopic){
            SecoundTopic.findByIdAndUpdate({_id:id},{name :topicName.trim(), description: req.body.topicDescription, updatedBy:req.session.user.userName, updatedAt: finalDate}, (err,result) =>{
                if(!err){
                    res.redirect("/admin/manage-secound-topic");
                } else {
                    console.log(err);
                }
            });
        }
        else {
            SecoundTopic.findByIdAndUpdate({_id:id},{name : topicName.trim(), fsTopic:mainTopic, description: req.body.topicDescription, updatedBy:req.session.user.userName, updatedAt: finalDate}, (err,result) =>{
                if(!err){
                    res.redirect("/admin/manage-secound-topic");
                } else {
                    console.log(err);
                }
            });
        }
        
    }
    
});

// admin/edit-secoud-topic route

app.get("/admin/edit-third-topic/:id", (req,res) =>{
    if(req.session.isLoggedIn){
        const id = req.params.id;
        
        ThirdTopic.findOne({_id:id},(err,topic) =>{
            SecoundTopic.find({},(err,secoundTopics)=>{
                res.render("edit",{
                    button: "Secound Topic",
                    header: "Add FiSecoundrst Topic",
                    firstInput: "Name",
                    firstinputName:"topicName",
                    secoundInput: "Description",
                    secoundInputName: "topicDescription",
                    frInputValue:topic.name,
                    scInputValue:topic.description,
                    inputsValue:topic,
                    mainTopics:secoundTopics,
                    page: "third-topic"
                });
            });
        });
    }

});

app.post("/admin/edit-third-topic/:id",(req,res) => {
    if(req.session.isLoggedIn){
        const date = Date().split(" ",4);
        const finalDate = date[1]+ "/" + date[2]+  "/" + date[3];
        const id = req.params.id;
        const mainTopic = req.body.mainTopic;
        const topicName = req.body.topicName;
        
        if(!mainTopic){
            ThirdTopic.findByIdAndUpdate({_id:id},{name : topicName.trim(), description: req.body.topicDescription, updatedBy:req.session.user.userName, updatedAt: finalDate}, (err,result) =>{
                if(!err){
                    res.redirect("/admin/manage-third-topic");
                } else {
                    console.log(err);
                }
            });
        }
        else {
            ThirdTopic.findByIdAndUpdate({_id:id},{name : topicName.trim(), scTopic:mainTopic, description: req.body.topicDescription, updatedBy:req.session.user.userName, updatedAt: finalDate}, (err,result) =>{
                if(!err){
                    res.redirect("/admin/manage-third-topic");
                } else {
                    console.log(err);
                }
            });
        }
        
    }
    
});


// admin/edit-user route

app.get("/admin/edit-user/:id", (req,res) =>{
    if(req.session.isLoggedIn){
        if(req.session.isAdmin){
            const id = req.params.id;
            User.findOne({_id:id},(err,user) =>{
                res.render("edit",{
                    button: "User",
                    header: "Edit User",
                    firstInput: "Full Name",
                    firstinputName:"userName",
                    frInputValue:user.userName,
                    inputsValue:user,
                    page: "user"
                });
            });
        }
    }
});


app.post("/admin/edit-user/:id",(req,res) => {
    if(req.session.isLoggedIn){
        if(req.session.isAdmin){
            const id = req.params.id;
            User.findByIdAndUpdate({_id:id},{userName : req.body.userName, email: req.body.email, role: req.body.role}, (err,result) =>{
                if(!err){
                    res.redirect("/admin/manage-user");
                } else {
                    console.log(err);
                }
            });
        }
    }
});

// admin/reset route

app.get("/admin/reset", (req,res)=>{
    res.render("reset",{
        page:"reset"
    });
});

app.post("/admin/reset", (req,res)=>{
    crypto.randomBytes(32 , (err,buffer)=>{
        if(err){
            console.log(err);
            res.redirect("/admin/reset");
        }
        const token = buffer.toString("hex");
        User.findOne({email: req.body.email}, (err,user)=>{
            if(!user){
                res.send("<h1>No user founded with that email</h1>");
                res.redirect("/admin/reset")
            }
            user.resetToken = token;
            user.resetTokenExpiration = Date.now() + 3600000;
            user.save(err => {
                if(!err){
                    res.redirect("/admin/login");
                    transporter.sendMail({
                        to: req.body.email,
                        from: "oesterbidlung@gmail.com",
                        subject: "Password reset",
                        html: `
                        <h1>You requested a password reset</h1>
                        <p>Click this <a href="http://localhost:3000/admin/reset/${token}">link</a> to set a new password!</p>
                        `
                    });
                }
            });
        });
    });
});

// admin/new-password 

app.get("/admin/reset/:token", (req,res)=>{
    const token = req.params.token;
    User.findOne({resetToken: token, resetTokenExpiration: {$gt: Date.now()}}, (err,user)=>{
        res.render("reset",{
            page:"new-password",
            userId:user._id.toString(),
            passwordToken: user.resetToken,
        })
    })
});

app.post("/admin/new-password", (req,res) => {
    const userId = req.body.userId;    
    const passwordToken = req.body.passwordToken;
    
    if (req.body.passwordConfirmation == req.body.password){
        User.findOne({_id:userId, resetToken: passwordToken, resetTokenExpiration: {$gt:Date.now()}}, (err,user)=>{
            bcrypt.hash(req.body.password, 12,(err, hash) => {
                user.password = hash;
                user.resetToken = undefined;
                user.resetTokenExpiration = undefined;
                user.save(err => {
                    if(!err){
                        res.redirect("/admin/login");
                    } else{
                        console.log(err);
                    }
                });
            });
        });  
    } else {
        res.send("<h1>Password confirmation was wrong!</h1>");
    }
});

// /posts/.... to render each post alone

app.get("/posts/:title",(req,res)=> {
    const requestedTitle = _.lowerCase(req.params.title);
    var relatedPosts =[];
        Post.find({},function(err,posts){
            posts.forEach(function(post){
            const storedTitle = _.lowerCase(post.title);
            if (storedTitle === requestedTitle) {
                for(let i = 0; i < posts.length ; i++){ 
                    if(posts[i].postTopic.toString() == post.postTopic.toString()){
                        if(post.title != posts[i].title){
                            relatedPosts.push(posts[i]);
                        }
                    }
                };
                console.log(relatedPosts);
                res.render("main-post",{
                    title:post.title,
                    post:post,
                    relatedPosts: relatedPosts,
                    metaTitle:post.title,
                    metaDescription:post.body,
                    metaImage:post.image
                });
            }
            });
    });   
});

// Categories route

app.get("/categories", (req,res) =>{
    FirstTopic.find({},(err,firstTopics)=>{
        SecoundTopic.find({},(err,secoundTopics)=>{
            ThirdTopic.find({},(err,thirdTopics)=>{
                res.render("categories",{
                    title: "Categories",
                    firstTopics:firstTopics,
                    secoundTopics:secoundTopics,
                    thirdTopics:thirdTopics,
                    metaTitle:"Yalla Austria | Categories",
                    metaDescription:"Yalla Austria is an online platform to help students to study in Austria. We share with you any new information about studying in Austria.",
                    metaImage:""
                });
            })
        })
    })
    
});

app.get("/categories/:name", (req,res)=>{
    const requestedName = _.lowerCase(req.params.name);
    
    ThirdTopic.find({},(err,topics)=>{
        if(err){
            console.log(err);
        } else{
            topics.forEach(topic => {
                const storedName = _.lowerCase(topic.name);
                if(storedName === requestedName){
                    Post.find({postTopic:topic._id},(err,posts)=>{
                        res.render("home",{
                            title: topic.name,
                            page:"categories",
                            posts:posts,
                            metaTitle:topic.name,
                            metaDescription:"Yalla Austria is an online platform to help students to study in Austria. We share with you any new information about studying in Austria.",
                            metaImage:""
                        });
                    });
                }
            });
        }
    });
});



// About Us route

app.get("/about-us", (req,res) =>{
    res.render("about-us",{
        title: "About Us",
        metaTitle:"Yalla Austria | About Us",
        metaDescription:"Yalla Austria is an online platform to help students to study in Austria. We share with you any new information about studying in Austria.",
        metaImage:""
    });
});

// Contact US route

app.get("/contact-us", (req,res) =>{
    res.render("contact-us",{
        title: "Contact Us",
        page:"contact-us",
        metaTitle:"Yalla Austria | Contact Us",
        metaDescription:"Yalla Austria is an online platform to help students to study in Austria. We share with you any new information about studying in Austria.",
        metaImage:""
    });
});

app.post("/contact-us", (req,res) =>{
    res.redirect("/");
    transporter.sendMail({
        to: "badr.123albaba@gmail.com",
        from: "oesterbidlung@gmail.com",
        subject: "Password reset",
        html: `<h3>${req.body.name} sent us this message</h3>
        <p>Email From : ${req.body.email}</p>
        <p>Name : ${req.body.name}</p>
        <p>Email Subject : ${req.body.subject}</p>
        <p>Email Message :</p>
        <p> ${req.body.message}</p>`
    });
})

app.listen(3000);