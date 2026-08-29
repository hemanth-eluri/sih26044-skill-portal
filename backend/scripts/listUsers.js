const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/isotopes');
  const users = await User.find({}, 'name email role createdAt').sort({ createdAt: 1 }).lean();

  if (!users.length) {
    console.log('No users found.');
    return;
  }

  users.forEach((user, index) => {
    console.log(`${index + 1}.`);
    console.log(`ID: ${user._id}`);
    console.log(`Name: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`Role: ${user.role}`);
    console.log(`Created: ${user.createdAt ? user.createdAt.toISOString() : 'Not available'}`);
    console.log('');
  });
}

main()
  .catch(error => {
    console.error(`Unable to list users: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
