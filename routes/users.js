const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');


mongoose.connect('mongodb://localhost:27017/Instagram-clone-nobile', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.on('connected', () => {
  console.log('Connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('Error connecting to MongoDB:', err);
});

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  name: String,
  bio:{
    type:String,
    default:"Write Bio here!"
  },
  profilePicture: { type: String },
  posts:[{type:mongoose.Schema.Types.ObjectId, ref:'Post'}],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

});

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', userSchema);

// module.exports = User;
