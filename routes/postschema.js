// models/post.js

const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, },
  imageUrl: { type: String }, // Assuming you want to store the image URL
  user: {
     type: mongoose.Schema.Types.ObjectId,
     ref: 'User', required: true },
  createdAt: {
      type: Date,
      default: Date.now,
    },
    likes:[{
      type:mongoose.Schema.Types.ObjectId,
      ref:"User",
    }]
  // Add any other fields you need for a post
});

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
