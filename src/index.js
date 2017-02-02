const createPublisher = require('./publisher');
const createConsumer = require('./consumer');

const createClient = (settings) => ({
  publish: createPublisher(settings),
  consumer: createConsumer(settings),
});

module.exports = createClient;