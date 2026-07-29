const normalizeCollegeCode = (req, res, next) => {
  if (req.params && req.params.collegeCode) {
    req.params.collegeCode = req.params.collegeCode.trim().toLowerCase();
  }
  if (req.body && req.body.collegeCode) {
    req.body.collegeCode = req.body.collegeCode.trim().toLowerCase();
  }
  if (req.query && req.query.collegeCode) {
    req.query.collegeCode = req.query.collegeCode.trim().toLowerCase();
  }
  next();
};

module.exports = normalizeCollegeCode;