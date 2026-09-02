const getYearLabelForSemester = (semester, yearLabels) => {
  if (!Array.isArray(yearLabels) || yearLabels.length === 0) {
    const yearIndex = Math.ceil((semester || 1) / 2) - 1;
    return `Year ${yearIndex + 1}`;
  }
  const yearIndex = Math.ceil((semester || 1) / 2) - 1;
  return yearLabels[Math.min(Math.max(yearIndex, 0), yearLabels.length - 1)] || `Year ${yearIndex + 1}`;
};

const normalizeYearLabels = (labels = []) => {
  if (!Array.isArray(labels)) return [];
  return labels
    .map((label) => (typeof label === "string" ? label.trim() : ""))
    .filter((label) => label.length > 0);
};

module.exports = {
  getYearLabelForSemester,
  normalizeYearLabels,
};
