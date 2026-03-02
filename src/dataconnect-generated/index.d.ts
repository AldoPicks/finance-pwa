import { ConnectorConfig, DataConnect, QueryRef, QueryPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface Account_Key {
  id: UUIDString;
  __typename?: 'Account_Key';
}

export interface Category_Key {
  id: UUIDString;
  __typename?: 'Category_Key';
}

export interface GetMyAccountsData {
  accounts: ({
    id: UUIDString;
    name: string;
    type: string;
    initialBalance: number;
    description?: string | null;
    createdAt: TimestampString;
  } & Account_Key)[];
}

export interface Transaction_Key {
  id: UUIDString;
  __typename?: 'Transaction_Key';
}

export interface User_Key {
  id: UUIDString;
  __typename?: 'User_Key';
}

interface GetMyAccountsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetMyAccountsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetMyAccountsData, undefined>;
  operationName: string;
}
export const getMyAccountsRef: GetMyAccountsRef;

export function getMyAccounts(): QueryPromise<GetMyAccountsData, undefined>;
export function getMyAccounts(dc: DataConnect): QueryPromise<GetMyAccountsData, undefined>;

