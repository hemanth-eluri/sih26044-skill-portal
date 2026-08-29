const mongoose = require('mongoose');
const User = require('../models/User');
const Student = require('../models/Student');
const Company = require('../models/Company');
const Application = require('../models/Application');
const { AssessmentResult } = require('../models/Assessment');
require('dotenv').config();

const usage = `Usage:
  npm run dev:reset-user -- --id=<USER_ID>
  npm run dev:reset-user -- --email=<EMAIL>
  npm run dev:reset-user -- --id=<USER_ID> --profile-only`;

function parseArguments() {
  const args = {};
  process.argv.slice(2).forEach(argument => {
    const separator = argument.indexOf('=');
    if (separator === -1) args[argument.replace(/^--/, '')] = true;
    else args[argument.slice(2, separator)] = argument.slice(separator + 1);
  });
  return args;
}

function safeCount(value) {
  return Number(value) || 0;
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('User reset utility is disabled in production.');
    process.exitCode = 1;
    return;
  }

  const args = parseArguments();
  if ((!args.id && !args.email) || (args.id && args.email)) {
    console.log(usage);
    process.exitCode = 1;
    return;
  }

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/isotopes');
  const query = args.id ? { _id: args.id } : { email: String(args.email).trim().toLowerCase() };
  const user = await User.findOne(query).select('name email role createdAt').lean();
  if (!user) {
    console.error('No matching user found. Nothing was deleted.');
    process.exitCode = 1;
    return;
  }

  const student = user.role === 'student' ? await Student.findOne({ userId: user._id }).select('_id').lean() : null;
  const studentId = student?._id;
  const applicationCount = studentId ? await Application.countDocuments({ studentId }) : 0;
  const assessmentResultCount = studentId ? await AssessmentResult.countDocuments({ studentId }) : 0;

  console.log(`User: ${user.name}`);
  console.log(`Email: ${user.email}`);
  console.log(`Role: ${user.role}`);
  console.log(`ID: ${user._id}`);
  console.log(`Student profile: ${studentId ? '1' : '0'}`);
  console.log(`Assessment results: ${assessmentResultCount}`);
  console.log(`Applications: ${applicationCount}`);
  console.log(`Mode: ${args['profile-only'] ? 'profile-only' : 'full user reset'}`);

  if (studentId) {
    const applications = await Application.find({ studentId }).select('_id companyId').lean();
    const applicationIds = applications.map(application => application._id);
    if (applicationIds.length) {
      await Company.updateMany(
        { applications: { $in: applicationIds } },
        { $pull: { applications: { $in: applicationIds } } }
      );
    }
    await Application.deleteMany({ studentId });
    await AssessmentResult.deleteMany({ studentId });
    await Student.deleteOne({ _id: studentId });
  }

  if (!args['profile-only']) {
    await User.deleteOne({ _id: user._id });
  }

  const remainingUser = await User.exists({ _id: user._id });
  const remainingByEmail = await User.exists({ email: user.email });
  if (!args['profile-only'] && (remainingUser || remainingByEmail)) {
    throw new Error('Reset did not remove the selected user; email is still present.');
  }

  console.log('');
  console.log(args['profile-only'] ? 'Development profile reset complete.' : 'Development user reset complete.');
  console.log('Deleted:');
  console.log(`User: ${args['profile-only'] ? '0' : '1'}`);
  console.log(`Student profile: ${studentId ? '1' : '0'}`);
  console.log(`Assessment results: ${safeCount(assessmentResultCount)}`);
  console.log(`Applications: ${safeCount(applicationCount)}`);
  console.log('External profiles: 0');
  console.log('Progress snapshots: 0');
  console.log(`Email available again: ${args['profile-only'] ? 'NO (user retained)' : 'YES'}`);
}

main()
  .catch(error => {
    console.error(`Reset failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
