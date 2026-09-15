const DEFAULT_MAX_ALLOWED_KTS = 3;

const resolveMaxAllowedKTs = (policy) =>
  policy?.maxAllowedKTs ?? DEFAULT_MAX_ALLOWED_KTS;

module.exports = {
  DEFAULT_MAX_ALLOWED_KTS,
  resolveMaxAllowedKTs,
};
