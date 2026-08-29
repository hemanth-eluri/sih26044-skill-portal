const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

async function start() {
  const server = await MongoMemoryServer.create({
    instance: { port: 27017, dbName: 'isotopes' },
    binary: { downloadDir: path.join(__dirname, '..', '.cache', 'mongodb-binaries') }
  });

  console.log(`ISOTOPES development MongoDB running at ${server.getUri('isotopes')}`);

  const stop = async () => {
    await server.stop();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

start().catch(error => {
  console.error('Failed to start development MongoDB:', error);
  process.exit(1);
});
