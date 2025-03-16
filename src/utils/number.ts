export class NumberUtils {
  /**
   * Calculates the percentage of a value relative to a total.
   *
   * @param {number} value - The value to calculate the percentage for.
   * @param {number} total - The total value to calculate the percentage against.
   * @returns {number} The calculated percentage. Returns 0 if the total is 0 or if either value is NaN.
   */
  static getPercentage(value: number, total: number): number {
    if (isNaN(value) || isNaN(total) || total === 0) {
      return 0;
    }
    return ((value / total) * 100);
  }

  /**
   * Calculates the percentage of a value relative to a total and returns it as a formatted string.
   *
   * @param {number} value - The value to calculate the percentage for.
   * @param {number} total - The total value to calculate the percentage against.
   * @returns {string} The calculated percentage as a string formatted to two decimal places.
   */
  static getPercentageString(value: number, total: number): string {
    const percentage = this.getPercentage(value, total);
    return `${percentage.toFixed(2)}%`;
  }
}