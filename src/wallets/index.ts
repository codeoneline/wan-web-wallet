import WanWallet from "./hydroWallet";
import ExtensionWallet from "./extensionWallet";
import BaseWallet from "./baseWallet";
import Ledger from "./ledger";
import Trezor from "./trezor";
import LightWallet from "./lightWallet";
import request from "request";
import { BigNumber } from "ethers-wan/utils";
import { Contract } from "ethers-wan";
import { JsonRpcProvider } from "ethers-wan/providers";
import Web3 from "web3";

let web3: Web3 | undefined;

const { NeedUnlockWalletError, NotSupportedError } = BaseWallet;
export let globalNodeUrl = "https://ropsten.infura.io";
export {
  BaseWallet,
  WanWallet,
  ExtensionWallet,
  NeedUnlockWalletError,
  NotSupportedError,
  Ledger,
  Trezor,
  LightWallet
};

export const payloadId = (): number => {
  const datePart = new Date().getTime() * Math.pow(10, 3);
  const extraPart = Math.floor(Math.random() * Math.pow(10, 3));
  const id = datePart + extraPart;
  return id;
};

export const setGlobalNodeUrl = (nodeUrl: string) => {
  if (nodeUrl) {
    globalNodeUrl = nodeUrl;
  }
};

export const truncateAddress = (address: string): string => {
  return address.slice(0, 6) + "..." + address.slice(-4);
};

export const getNetworkID = (): Promise<number> => {
  return new Promise((resolve, reject) => {
    if (globalNodeUrl.indexOf('ws') === 0) {
      if (!web3) {
        web3 = new Web3(new Web3.providers.WebsocketProvider(globalNodeUrl));
      }

      web3.eth.net.getId((err, id) => {
        if (err) {
          web3 = undefined;
          reject(err);
        } else {
          resolve(id);
        }
      });
    } else {
      request.post(
        globalNodeUrl,
        {
          headers: { "content-type": "application/json" },
          form: `{"jsonrpc":"2.0","method":"net_version","params":[],"id":${payloadId()}}`
        },
        (error, response, data) => {
          if (error) {
            reject(error);
          }
          try {
            if (data) {
              const json = JSON.parse(data);
              resolve(parseInt(json.result, 10));
            }
          } catch (e) {
            reject(e);
          }
        }
      );
    }
  });
};

export const sendRawTransaction = (data: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (globalNodeUrl.indexOf('ws') === 0) {
      if (!web3) {
        web3 = new Web3(new Web3.providers.WebsocketProvider(globalNodeUrl));
      }

      web3.eth.sendSignedTransaction(data, (err, hash) => {
        if (err) {
          web3 = undefined;
          reject(err);
        } else {
          resolve(hash);
        }
      });
    } else {
      request.post(
        globalNodeUrl,
        {
          headers: { "content-type": "application/json" },
          form: `{"jsonrpc":"2.0","method":"eth_sendRawTransaction","params":["${data}"],"id":${payloadId()}}`
        },
        (error, response, data) => {
          if (error) {
            reject(error);
          }
          try {
            if (data) {
              const json = JSON.parse(data);
              if (json.result) {
                resolve(json.result);
              } else if (json.error) {
                reject(json.error);
              } else {
                reject(new Error("Unknown Error"));
              }
            }
          } catch (e) {
            reject(e);
          }
        }
      );
    }
  });
};

export const getBalance = (address: string): Promise<BigNumber> => {
  return new Promise((resolve, reject) => {
    if (globalNodeUrl.indexOf('ws') === 0) {
      if (!web3) {
        web3 = new Web3(new Web3.providers.WebsocketProvider(globalNodeUrl));
      }

      web3.eth.getBalance(address, (err, balance) => {
        if (err) {
          web3 = undefined;
          reject(err);
        } else {
          resolve(new BigNumber(balance));
        }
      });
    } else {
      request.post(
        globalNodeUrl,
        {
          headers: { "content-type": "application/json" },
          form: `{"jsonrpc":"2.0","method":"eth_getBalance","params":["${address}", "latest"],"id":${payloadId()}}`
        },
        (error, response, data) => {
          if (error) {
            reject(error);
          }
          try {
            if (data) {
              const json = JSON.parse(data);
              resolve(new BigNumber(json.result));
            }
          } catch (e) {
            reject(e);
          }
        }
      );
    }
  });
};

export const getTransactionReceipt = (txID: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (globalNodeUrl.indexOf('ws') === 0) {
      if (!web3) {
        web3 = new Web3(new Web3.providers.WebsocketProvider(globalNodeUrl));
      }

      web3.eth.getTransactionReceipt(txID, (err, data) => {
        if (err) {
          web3 = undefined;
          reject(err);
        } else {
          resolve(data);
        }
      });
    } else {
      request.post(
        globalNodeUrl,
        {
          headers: { "content-type": "application/json" },
          form: `{"jsonrpc":"2.0","method":"eth_getTransactionReceipt","params":["${txID}"],"id":${payloadId()}}`
        },
        (error, response, data) => {
          if (error) {
            reject(error);
          }
          try {
            if (data) {
              const json = JSON.parse(data);
              resolve(json.result);
            }
          } catch (e) {
            reject(e);
          }
        }
      );
    }
  });
};
export const getEstimateGas = (params: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (globalNodeUrl.indexOf('ws') === 0) {
      if (!web3) {
        web3 = new Web3(new Web3.providers.WebsocketProvider(globalNodeUrl));
      }

      web3.eth.estimateGas(params, (err, gas) => {
        if (err) {
          web3 = undefined;
          reject(err);
        } else {
          resolve(gas);
        }
      });
    } else {
      request.post(
        globalNodeUrl,
        {
          headers: { "content-type": "application/json" },
          form: `{"jsonrpc":"2.0","method":"eth_estimateGas","params":[${JSON.stringify(params)}],"id":${payloadId()}}`
        },
        (error, response, data) => {
          if (error) {
            reject(error);
          }
          try {
            if (data) {
              const json = JSON.parse(data);
              resolve(json.result);
            }
          } catch (e) {
            reject(e);
          }
        }
      );
    }
  });
};

export const getTransactionCount = (address: string, status: string = "latest"): Promise<number> => {
  return new Promise((resolve, reject) => {
    if (globalNodeUrl.indexOf('ws') === 0) {
      if (!web3) {
        web3 = new Web3(new Web3.providers.WebsocketProvider(globalNodeUrl));
      }
      web3.eth.getTransactionCount(address, (err, data) => {
        if (err) {
          web3 = undefined;
          reject(err);
        } else {
          resolve(data);
        }
      });
    } else {
      request.post(
        globalNodeUrl,
        {
          headers: { "content-type": "application/json" },
          form: `{"jsonrpc":"2.0","method":"eth_getTransactionCount","params":["${address}","${status}"],"id":${payloadId()}}`
        },
        (error, response, data) => {
          if (error) {
            reject(error);
          }
          try {
            if (data) {
              const json = JSON.parse(data);
              resolve(Number(json.result));
            }
          } catch (e) {
            reject(e);
          }
        }
      );
    }
  });
};

export const getContract = (contractAddress: string, abi: any): Contract => {
  const provider = new JsonRpcProvider(globalNodeUrl);
  return new Contract(contractAddress, abi, provider);
};

export const defaultWalletTypes = [ExtensionWallet.TYPE, WanWallet.TYPE, Ledger.TYPE, Trezor.TYPE, LightWallet.TYPE];
