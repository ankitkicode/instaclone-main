var express = require('express');
var router = express.Router();
const userModel= require("./users");
const passport = require('passport');
const upload = require("./multerUpload");
const postModel = require("./postschema");
const { calculateTimeDifference }= require("./calculate");
const { render } = require('ejs');


router.get('/', function(req, res) {
  res.render('index', {footer: false});
});

router.post("/register",function(req,res ){
 var newUser = new userModel({
  username: req.body.username,
  email: req.body.email,
  name: req.body.name,
 });

 userModel.register(newUser,req.body.password)
 .then(function(u){
  passport.authenticate("local")(req ,res ,function(){
    console.log(req.user);
    res.redirect("/feed")
  })
 }).catch(function(e){
  console.log(e);
  res.send(e);
 })
});
router.get('/login', function(req, res) {
  var error=req.flash('error');
  console.log(error)
  res.render('login', {footer: false,error});
});
router.post('/login', passport.authenticate('local', {
  successRedirect: '/feed', // Redirect on successful login
  failureRedirect: '/login', // Redirect on failed login
  failureFlash:true,
}));
router.get('/logout', function(req, res, next){
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/login');
  });
});


router.get('/feed', isLoggedIn, async function(req, res) {
  const user= await userModel.findOne({username:req.session.passport.user});
  const allPost = await postModel.find({ user: { $ne: user._id } }).populate("user");
  // console.log(allPost)
  // console.log(user)
  res.render('feed', {footer: true,user,allPost,calculateTimeDifference });
});

router.get('/profile', isLoggedIn, async function(req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user }).populate("posts");
console.log(user);  // Log the user object
const userFollowsLoggedUser = user.following.includes(user._id);
console.log(userFollowsLoggedUser);  // Log the value of userFollowsLoggedUser
res.render('profile', { footer: true, user, userFollowsLoggedUser });

});

router.post('/upload/profilePicture', isLoggedIn, upload.single("profilePic"), async function(req, res) {
  console.log(req.file);
  try {
    const user = await userModel.findOne({ username: req.session.passport.user });
    if (!user) {
      return res.status(404).send('User not found.');
    }
    if (!req.file) {
      // No file was uploaded
      return res.status(400).send('No file uploaded.');
    }
    // Update the user's picture field with the filename
    user.profilePicture = req.file.filename;
    // Save the updated user model
    await user.save();
    // Redirect to the profile page on success
    res.redirect('/edit');
  } catch (error) {
    console.error(error);

  }
});

router.get('/search', isLoggedIn, async function(req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  res.render('search', {footer: true,user});
});

router.get('/edit', isLoggedIn, async function(req, res) {
const user= await userModel.findOne({username:req.session.passport.user});
// console.log(user.bio);
  res.render('edit', {footer: true,user});
});

router.post('/editprofile',isLoggedIn, async function(req,res,next){
  const username = req.body.username;
  const name = req.body.name;
  const bio = req.body.bio;
  try{
   const user = await userModel.findOne({username:req.session.passport.user});
   if(!user) throw new Error ("User not found!");

   //update information
   user.username= username;
   user.name= name;
   user.bio= bio;
   //save the updated user info.
   await user.save();
     // Redirect back to the login page with a success message
     req.login(user, (err) => {
      if (err) {
        console.error(err);
        return res.render('error');
      }
      return res.redirect('/profile'); // Redirect to the user's profile page after updating
    });
   

  }catch(error){
    console.error(error);
    res.render('error');
  }

});
router.get('/upload', isLoggedIn, async function(req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  res.render('upload', {footer: true,user});
});


router.post('/upload', isLoggedIn, upload.single("image") , async function(req, res) {
  if(!req.file){
    return res.status(404).send("no file were given")
  }
  const LoggedInUser = await  userModel.findOne({username:req.session.passport.user})
  const { content,title } = req.body;
  const postData= await postModel.create({
    title:title,
    content: content,
    imageUrl:req.file.filename,
    user:LoggedInUser._id,
  });
  LoggedInUser.posts.push(postData._id);
  await LoggedInUser.save();

  console.log(LoggedInUser.posts)
  // console.log(LoggedInUser)
res.redirect("/profile" );
});

router.post('/api/togglefollow/:userId', isLoggedIn, async (req, res) => {
  try {
    const userIdToToggle = req.params.userId;
    const loggedUserId = req.user.id;
    // Find the logged-in user
    const loggedUser = await userModel.findById(loggedUserId);

    // Check if the user is already following
    const isFollowing = loggedUser.following.includes(userIdToToggle);

    // Toggle follow status
    if (isFollowing) {
      // Unfollow
      loggedUser.following.pull(userIdToToggle);

      // Remove logged user from the follower's followers list
      const userToUnfollow = await userModel.findById(userIdToToggle);
      userToUnfollow.followers.pull(loggedUserId);
      await userToUnfollow.save();
    } else {
      // Follow
      loggedUser.following.push(userIdToToggle);

      // Add logged user to the followed user's followers list
      const userToFollow = await userModel.findById(userIdToToggle);
      userToFollow.followers.push(loggedUserId);
      await userToFollow.save();
    }

    await loggedUser.save();

    res.json({ success: true, isFollowing: !isFollowing });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});
 
router.post('/api/togglelike/:postId', isLoggedIn, async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.user.id;

    // Find the post
    const post = await postModel.findById(postId);

    // Check if the user has already liked the post
    const isLiked = post.likes.includes(userId);

    if (isLiked) {
      // Unlike the post
      post.likes = post.likes.filter(likedUserId => likedUserId.toString() !== userId);
    } else {
      // Like the post
      post.likes.push(userId);
    }

    // Save the updated post
    await post.save();

    // Send response with updated like status and count
    res.json({
      success: true,
      isLiked: !isLiked,
      likeCount: post.likes.length,
    });
  } catch (error) {
    console.error('Error:', error);
    res.json({ success: false, error: 'Failed to toggle like status' });
  }
});

router.get('/profile/:username/posts',isLoggedIn,async function(req,res){
  const username= req.params.username;
  const allPost = await userModel.findOne({username:username}).populate('posts')
  const user = await userModel.findOne({username:req.session.passport.user});
  console.log(user)
  // console.log(allPost)
res.render('login-profile-posts',{allPost,user,calculateTimeDifference,footer: true });
});

router.get('/profile/:username',isLoggedIn,async function(req,res){
  const username= req.params.username;
  const profileUser = await userModel.findOne({username:username}).populate('posts')
  const user = await userModel.findOne({username:req.session.passport.user});
  const userFollowsLoggedUser = user.following.includes(profileUser._id);
  // console.log(profileUser)
  console.log(userFollowsLoggedUser)
res.render('profile-feed-post',{profileUser,user,userFollowsLoggedUser,footer: true });
});

// Route to delete a post by its ID
router.get('/api/deletepost/:postId', isLoggedIn, async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.user.id;

    // Find the post
    const post = await postModel.findById(postId);
    console.log(post);

    // Check if the logged-in user is the owner of the post
    if (post.user.toString() === userId) {
      // Delete the post
     await post.deleteOne();
      // Call the redirect function after deleting the post
      res.redirect("/profile")
    } else {
      // If the logged-in user is not the owner, respond with an error
      res.status(403).json({ success: false, error: 'You are not authorized to delete this post.' });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

router.get("/username/:username",isLoggedIn,async (req,res)=>{
 const search_term = req.params.username;
 let users = await userModel.find({ username: { $regex: new RegExp(search_term, 'i') } })
console.log(users);
res.json(users);

});

router.get('/uploadVideo', isLoggedIn, async function(req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  res.render('uploadVideo', {footer: true,user});
});

router.post('/uploadVideo', isLoggedIn, async function(req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  
});

router.get('/showReel', isLoggedIn, async function(req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  res.render('showReel', {footer: true,user});
});






function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login'); // Redirect to login page if not authenticated
}


module.exports = router;


