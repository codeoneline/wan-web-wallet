import { Wallet, utils } from "ethers-wan";
import { JsonRpcProvider, Web3Provider } from "ethers-wan/providers";
import BaseWallet, { txParams } from "./baseWallet";
import { BigNumber } from "ethers-wan/utils";
import * as ethUtil from "ethereumjs-util";
import Web3 from "web3";

export default class WanWallet extends BaseWallet {
  private static TIMEOUT = 15 * 60 * 1000; // 15 minutes
  private static WALLETS_KEY = "Wan-Wallets";
  private static _cache: Map<string, any> = new Map();

  public static TYPE = "Wan-Wallet";
  public static LABEL = "Browser Wallet";

  private static nodeUrl: string;
  public _address: string | null = null;
  public _wallet: Wallet | null = null;
  private _timer?: number;
  private _provider?: JsonRpcProvider;

  private constructor(address: string, wallet?: any) {
    super();
    this._address = address.toLowerCase();
    if (wallet) {
      this._wallet = wallet.connect(this.getProvider());
    }
  }

  public static async createRandom(): Promise<WanWallet> {
    const wallet = await Wallet.createRandom();
    const hydroWallet = new WanWallet(wallet.address, wallet);

    return hydroWallet;
  }

  public static async import(privateKey: string, password: string): Promise<WanWallet> {
    const wallet = await new Wallet(privateKey);
    const hydroWallet = new WanWallet(wallet.address, wallet);
    await hydroWallet.save(password);
    return hydroWallet;
  }

  public static async fromMnemonic(mnemonic: string, password: string, path?: string): Promise<WanWallet> {
    const wallet = await Wallet.fromMnemonic(mnemonic, path);
    const hydroWallet = new WanWallet(wallet.address, wallet);
    await hydroWallet.save(password);
    return hydroWallet;
  }

  public async save(password: string): Promise<boolean> {
    if (!this._wallet || !this._address) {
      return false;
    }
    const data = await this._wallet.encrypt(password);
    const wallets = WanWallet.getWalletData();
    const index = wallets.findIndex(json => WanWallet.parseWalletAddress(json) === this._address);
    if (index !== -1) {
      wallets.splice(index, 1, data);
    } else {
      wallets.push(data);
    }

    WanWallet.setWalletData(wallets);
    return true;
  }

  public delete(): boolean {
    this._wallet = null;
    WanWallet._cache.delete(this._address!);
    const wallets = WanWallet.getWalletData().filter(json => WanWallet.parseWalletAddress(json) !== this._address);
    WanWallet.setWalletData(wallets);
    return true;
  }

  public static setNodeUrl(nodeUrl: string) {
    if (nodeUrl) {
      this.nodeUrl = nodeUrl;
    }
  }

  public type(): string {
    return WanWallet.TYPE;
  }

  public id(): string {
    return WanWallet.TYPE + ":" + this._address;
  }

  public static list(): WanWallet[] {
    return this.getWalletData().map(json => {
      const wallet = this.getWallet(this.parseWalletAddress(json));
      return wallet;
    });
  }

  private static setWalletData(wallets: any[]) {
    localStorage.setItem(this.WALLETS_KEY, JSON.stringify(wallets));
  }

  private static getWalletData(): any[] {
    return JSON.parse(localStorage.getItem(this.WALLETS_KEY) || "[]");
  }

  private static parseWalletAddress(json: any): string {
    return utils.getAddress(JSON.parse(json).address).toLowerCase();
  }

  private static getWallet(address: string, _wallet?: any): WanWallet {
    let wallet = this._cache.get(address);
    if (!wallet || wallet._address !== address) {
      wallet = new WanWallet(address, _wallet);
      this._cache.set(address, wallet);
    }
    return wallet;
  }

  public signMessage(message: string | Uint8Array): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this._wallet) {
        reject(BaseWallet.NeedUnlockWalletError);
      } else {
        resolve(this._wallet.signMessage(message));
      }
    });
  }

  public signPersonalMessage(message: string | Uint8Array): Promise<string> {
    return this.signMessage(ethUtil.toBuffer(message));
  }

  public async sendTransaction(txParams: txParams): Promise<string | undefined> {
    if (txParams.value) {
      txParams.value = new BigNumber(txParams.value);
    }
    if (!this._wallet) {
      return Promise.reject(BaseWallet.NeedUnlockWalletError);
    } else {
      const tx = await this._wallet.sendTransaction(txParams);
      return tx.hash;
    }
  }

  public async sendCustomRequest(method: string, params: any): Promise<any> {
    if (!this._provider) {
      return Promise.reject(BaseWallet.NeedUnlockWalletError);
    } else {
      const tx = await this._provider.send(method, params);
      return tx;
    }
  }

  public getAddresses(): Promise<string[]> {
    return new Promise(resolve => {
      if (this._address) {
        resolve([this._address]);
      } else {
        resolve([]);
      }
    });
  }

  public async loadNetworkId(): Promise<number | undefined> {
    if (!this._wallet || !this._wallet.provider) {
      return;
    }
    const network = await this._wallet.provider.getNetwork();
    return network.chainId;
  }

  public async lock() {
    this._wallet = null;
  }

  public async unlock(password: string) {
    const json = WanWallet.getWalletData().find(json => WanWallet.parseWalletAddress(json) === this._address);

    this._wallet = await Wallet.fromEncryptedJson(json, password);
    this._wallet = this._wallet.connect(this.getProvider());
    this.resetTimeout();
  }

  public isLocked() {
    return !this._wallet;
  }

  public isSupported() {
    return true;
  }

  private getProvider(): JsonRpcProvider {
    if (this._provider) {
      return this._provider;
    }
    if (WanWallet.nodeUrl.indexOf('ws') === 0) {
      this._provider = new Web3Provider(new Web3.providers.WebsocketProvider(WanWallet.nodeUrl));
      return this._provider;
    } 
    
    this._provider = new JsonRpcProvider(WanWallet.nodeUrl);
    return this._provider;
  }

  public getMnemonic(): string {
    if (!this._wallet) {
      throw BaseWallet.NeedUnlockWalletError;
    }
    this.resetTimeout();
    return this._wallet.mnemonic;
  }

  public getPrivateKey(): string {
    if (!this._wallet) {
      throw BaseWallet.NeedUnlockWalletError;
    }
    this.resetTimeout();
    return this._wallet.privateKey;
  }

  private resetTimeout() {
    if (this._timer) {
      window.clearTimeout(this._timer);
    }
    this._timer = window.setTimeout(() => this.lock(), WanWallet.TIMEOUT);
  }
  public name(): string {
    return "Hydro Wallet";
  }
}
