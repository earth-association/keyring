/* eslint-disable @typescript-eslint/no-explicit-any */
/* esleslint-disable  prefer-const */

import { Actor, HttpAgent } from '@dfinity/agent';
import { key_new, Session } from '@dfinity/rosetta-client';
import { address_from_hex } from '@dfinity/rosetta-client';
import { sha224 } from '@dfinity/rosetta-client/lib/hash';
import axios, { AxiosRequestConfig } from 'axios';
import ledger from '../ledger';
import fetch from 'cross-fetch';

export { address_to_hex } from '@dfinity/rosetta-client';
import { TxsPage } from '@xchainjs/xchain-client';

//https://github.com/dfinity/agent-js/blob/6e8c64cf07c7722aafbf52351eb0f19fcb954ff0/packages/identity-ledgerhq/src/identity/secp256k1.ts

export const getBalance = async (address) => {
  let serverRes = {
    value: 0,
    currency: {
      symbol: 'ICP',
      decimals: 0,
    },
  };

  const data = {
    network_identifier: {
      blockchain: 'Internet Computer',
      network: '00000000000000020101',
    },
    account_identifier: {
      address: address,
    },
  };

  const config: AxiosRequestConfig = {
    method: 'post',
    url: 'https://rosetta-api.internetcomputer.org/account/balance',
    headers: {
      accept: 'application/json, text/plain, */*',
    },
    data: data,
  };

  await axios(config)
    .then(function (response) {
      serverRes = response.data;
    })
    .catch(function (error) {
      console.log(error);
    });

  return serverRes;
};

export const getTransactions = async (address): Promise<TxsPage> => {
  let serverRes = { total_count: 0, transactions: [] };
  const txns = {} as TxsPage;
  const data = {
    network_identifier: {
      blockchain: 'Internet Computer',
      network: '00000000000000020101',
    },
    account_identifier: {
      address: address,
    },
  };

  const config: AxiosRequestConfig = {
    method: 'post',
    url: 'https://rosetta-api.internetcomputer.org/search/transactions',
    headers: {
      accept: 'application/json, text/plain, */*',
    },
    data: data,
  };

  await axios(config)
    .then(function (response) {
      serverRes = response.data;
    })
    .catch(function (error) {
      console.log(error);
    });

  txns.total = serverRes?.total_count;
  txns.txs = serverRes?.transactions;
  return txns;
};

/**
 *
 * @param {String} src_private_key
 * hex of derived child private key of character length 64 and buffer size 32 bytes
 * @param {String} dest_addr
 * e.g 07b1b5f1f023eaa457a6d63fe00cea8cae5c943461350de455cb2d1f3dec8992
 * @param {BigInt} amount
 * Specifies the number of ICP tokens to transfer. Can be specified as a number with up to eight (8) decimal places.
 * @param {BigInt?} max_fee
 * Specifies a transaction fee. The default is 10000 e8s i.e 0.0001 ICP .
 * @param {object} opts
 * @returns {Promise<TransactionIdentifierResponse>}
 */

export const sendTransaction = async (src_private_key, dest_addr, amount) => {
  const session = new Session({
    baseUrl: 'https://rosetta-api.internetcomputer.org',
  });

  const _src_private_key = key_new(Buffer.from(src_private_key, 'hex'));
  const _dest_addr_buff = address_from_hex(dest_addr);

  let submit_result;

  try {
    submit_result = await session.transfer(
      _src_private_key,
      _dest_addr_buff,
      amount
    );
  } catch (error) {
    console.log(error);
  }

  console.log(submit_result);
  return submit_result;
};

const getSubAccountArray = (s) => {
  return Array(28)
    .fill(0)
    .concat(to32bits(s ? s : 0));
};
const to32bits = (num) => {
  const b = new ArrayBuffer(4);
  new DataView(b).setUint32(0, num);
  return Array.from(new Uint8Array(b));
};

export const sendICP = async (identity, to_aid, from_sub, amount) => {
  const agent = await Promise.resolve(
    new HttpAgent({
      host: 'https://ic0.app/',
      fetch,
      identity: identity,
    })
  ).then(async (ag) => {
    // await ag.fetchRootKey();
    return ag;
  });

  const API = Actor.createActor(ledger, {
    agent: agent,
    canisterId: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
  });

  const b = await API.send_dfx({
    to: to_aid,
    fee: { e8s: 10000 },
    memo: 0,
    from_subaccount: [getSubAccountArray(from_sub)],
    created_at_time: [],
    amount: { e8s: Math.floor(amount * 100000000) },
  });
  return b;
};

export const utf8ToBytes = (str: string): Uint8Array => {
  const isString = (obj: any): boolean => {
    return obj === `${obj}`;
  };
  if (!isString(str)) {
    throw new Error(`${str} is not string`);
  }
  const arr = [];
  for (let i = 0; i < str.length; i++) {
    arr.push(str.charCodeAt(i));
  }
  return new Uint8Array(arr);
};

export const SUB_ACCOUNT_ZERO = Buffer.alloc(32);
export const ACCOUNT_DOMAIN_SEPERATOR = Buffer.from('\x0Aaccount-id');

export const principal_id_to_address = (pid) => {
  return sha224([ACCOUNT_DOMAIN_SEPERATOR, pid.toBlob(), SUB_ACCOUNT_ZERO]);
};

export const indexToHash = (index) => {
  const fetchHeaders = new Headers();
  fetchHeaders.append('cache-control', 'no-cache');
  fetchHeaders.append('accept', 'application/json, text/plain, */*');
  fetchHeaders.append('content-type', 'application/json;charset=UTF-8');

  const raw = {
    network_identifier: {
      blockchain: 'Internet Computer',
      network: '00000000000000020101',
    },
    block_identifier: { index: index },
  };
  const requestOptions: RequestInit = {
    method: 'POST',
    headers: fetchHeaders,
    body: JSON.stringify(raw),
    redirect: 'follow',
  };

  const hash = fetch(
    'https://rosetta-api.internetcomputer.org/block',
    requestOptions
  )
    .then((response) => response.text())
    .then((result) => console.log(result))
    .catch((error) => console.log('error', error));

  return hash;
};
