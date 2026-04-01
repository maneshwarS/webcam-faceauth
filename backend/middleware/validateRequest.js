/**
 * Returns a middleware that validates required fields are present and non-empty in req.body.
 */
function requireFields(...fields) {
  return (req, res, next) => {
    for (const field of fields) {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }
    next();
  };
}

/**
 * Validates that a descriptor is a plain array of exactly 128 numbers.
 */
function validateDescriptor(req, res, next) {
  const { descriptor } = req.body;
  if (!Array.isArray(descriptor) || descriptor.length !== 128) {
    return res.status(400).json({ error: 'descriptor must be an array of 128 numbers' });
  }
  if (!descriptor.every(v => typeof v === 'number' && isFinite(v))) {
    return res.status(400).json({ error: 'descriptor values must all be finite numbers' });
  }
  next();
}

module.exports = { requireFields, validateDescriptor };
