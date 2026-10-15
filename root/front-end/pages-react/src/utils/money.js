/**
 * Money formatting utilities matching PlayCarys platform contracts.
 * Amounts are in Indian rupees and stored as paise.
 */
export const Money = {
  /**
   * 12345 -> "₹123.45", 500000 -> "₹5,000"
   */
  formatINR(paise, opts) {
    const p = Math.round(Number(paise) || 0);
    const rupees = p / 100;
    const decimals = (opts && opts.decimals != null)
      ? opts.decimals
      : (p % 100 === 0 ? 0 : 2);
    return '₹' + rupees.toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  },

  /**
   * Carys are whole numbers, grouped the Indian way (1,00,000).
   */
  formatCarys(carys) {
    return (Number(carys) || 0).toLocaleString('en-IN');
  }
};

export default Money;
