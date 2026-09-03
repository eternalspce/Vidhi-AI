// Explicit Vercel Function entry point for the health check.
const app = require("../server");

module.exports = (req, res) => {
  req.url = `/api/health${req.url === "/" ? "" : req.url}`;
  return app(req, res);
};
