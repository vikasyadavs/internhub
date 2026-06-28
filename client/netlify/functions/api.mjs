import serverless from '../../../server/node_modules/serverless-http/serverless-http.js';
import app from '../../../server/src/index.js';

const apiHandler = serverless(app);

export const handler = (event, context) => {
  const normalizedEvent = {
    ...event,
    path: event.path?.replace(/^\/\.netlify\/functions\/api/, '') || event.path,
  };

  return apiHandler(normalizedEvent, context);
};
