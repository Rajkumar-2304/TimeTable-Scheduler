const serverless = require('serverless-http');
const app = require('../../server/index');

// Fix path so Express sees /api/... correctly
module.exports.handler = async (event, context) => {
  const originalPath = event.path;
  // Ensure path starts with /api
  if (!event.path.startsWith('/api')) {
    event.path = '/api' + event.path;
  }
  const handler = serverless(app);
  return handler(event, context);
};
