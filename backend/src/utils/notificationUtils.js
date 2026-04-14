const sendAlert = async ({ productId, productName, currentStock, minThreshold }) => {
  console.warn(
    `[LOW_STOCK_ALERT] product=${productName || productId} stock=${currentStock} threshold=${minThreshold}`
  );

  return true;
};

module.exports = {
  sendAlert
};
