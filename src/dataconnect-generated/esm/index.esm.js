import { queryRef, executeQuery, validateArgs } from 'firebase/data-connect';

export const connectorConfig = {
  connector: 'example',
  service: 'finance-pwa',
  location: 'us-east4'
};

export const getMyAccountsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetMyAccounts');
}
getMyAccountsRef.operationName = 'GetMyAccounts';

export function getMyAccounts(dc) {
  return executeQuery(getMyAccountsRef(dc));
}

