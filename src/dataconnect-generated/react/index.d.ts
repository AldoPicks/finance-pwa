import { GetMyAccountsData } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useGetMyAccounts(options?: useDataConnectQueryOptions<GetMyAccountsData>): UseDataConnectQueryResult<GetMyAccountsData, undefined>;
export function useGetMyAccounts(dc: DataConnect, options?: useDataConnectQueryOptions<GetMyAccountsData>): UseDataConnectQueryResult<GetMyAccountsData, undefined>;
