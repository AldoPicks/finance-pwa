const { queryRef, executeQuery, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'example',
  service: 'finance-pwa',
  location: 'us-east4'
};
exports.connectorConfig = connectorConfig;

const getMyAccountsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetMyAccounts');
}
getMyAccountsRef.operationName = 'GetMyAccounts';
exports.getMyAccountsRef = getMyAccountsRef;

exports.getMyAccounts = function getMyAccounts(dc) {
  return executeQuery(getMyAccountsRef(dc));
};
