/**
 * Test Setup File
 * Initializes test environment and MongoDB memory server
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const path = require('path');

let mongoServer;

/**
 * Start in-memory MongoDB before tests
 */
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    binary: { downloadDir: path.join(__dirname, '.cache', 'mongodb-binaries') }
  });
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri);
});

/**
 * Clean up after tests
 */
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

/**
 * Clear all collections between tests
 */
afterEach(async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});
