require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
// Change 'Admin' to 'admin' (lowercase a)
const Admin = require('../models/admin');

async function run() {
  const [,, username, password] = process.argv;

  if (!username || !password) {
    console.log('Usage: node scripts/createAdmin.js <username> <password>');
    process.exit(1);
  }

  const MONGODB_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/kiltukarareg';
  await mongoose.connect(MONGODB_URI);

  const existing = await Admin.findOne({ username });
  if (existing) {
    console.log(`Admin "${username}" already exists.`);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await Admin.create({ username, passwordHash });

  console.log(`Admin account "${username}" created successfully.`);
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});