module.exports = { getPercentageString };

function getPercentage(value, total) {
  if (isNaN(value) || isNaN(total) || total === 0) {
    return 0;
  }
  return ((value / total) * 100);
}

function getPercentageString(value, total) {
  const percentage = getPercentage(value, total);
  return `${percentage.toFixed(2)}%`;
}