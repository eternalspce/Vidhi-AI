// Explicit Vercel Function entry point for the chat API.
// Vercel may pass the function-local path as `/`; normalize it before
// handing the request to the Express app.
const app = require("../server");

module.exports = (req, res) => {
  req.url = `/api/chat${req.url === "/" ? "" : req.url}`;
  return app(req, res);
};
