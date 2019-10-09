import * as React from "react";
import { connect } from "react-redux";
import { Trezor, truncateAddress, getBalance } from "../../wallets";
import { getAccount } from "../..";
import { loadLedger, selectAccount } from "../../actions/wallet";
import Select, { Option } from "./Select";
import { BigNumber } from "bignumber.js";
import ReactPaginate from "react-paginate";
import { WalletState } from "../../reducers/wallet";
import NotSupport from "./NotSupport";
import copy from "clipboard-copy";

interface Props {
  dispatch: any;
  wallet: Trezor | null;
  isLocked: boolean;
  ledgerConnecting: boolean;
  walletTranslations: { [key: string]: any };
  copyCallback?: (text: string) => any;
}

interface State {
  loading: boolean;
  addresses: { [key: string]: string };
  balances: { [key: string]: BigNumber };
  pathType: string;
  realPath: string;
  index: number;
  currentAddress: string | null;
  currentPage: number;
  gotoPageInputValue: number;
}

const mapStateToProps = (state: { WalletReducer: WalletState }) => {
  const account = getAccount(state, Trezor.TYPE);
  return {
    wallet: account ? (account.get("wallet") as Trezor) : null,
    isLocked: account ? account.get("isLocked") : true,
    ledgerConnecting: state.WalletReducer.get("ledgerConnecting"),
    walletTranslations: state.WalletReducer.get("walletTranslations")
  };
};

const batchCount = 3;
class TrezorConnector extends React.PureComponent<Props, State> {
  public constructor(props: Props) {
    super(props);
    this.state = {
      loading: false,
      pathType: Trezor.getPathType(Trezor.currentBasePath),
      realPath: Trezor.currentBasePath,
      index: 0,
      currentPage: 0,
      addresses: {},
      balances: {},
      currentAddress: null,
      gotoPageInputValue: 1
    };
  }

  public componentDidMount() {


    const { wallet } = this.props;
    const { addresses } = this.state;
    if (wallet && wallet.connected) {
      this.loadAddresses();
    }
    if (addresses) {
      this.loadBalances();
    }
  }

  public componentDidUpdate(prevProps: Props, prevState: State) {
    const { wallet } = this.props;
    const { addresses, index, realPath, pathType } = this.state;

    if (
      wallet &&
      wallet.connected &&
      (Object.values(addresses).length === 0 ||
        wallet !== prevProps.wallet ||
        index !== prevState.index ||
        (pathType !== Trezor.CUSTOMIZAION_PATH && realPath !== prevState.realPath))
    ) {
      this.loadAddresses();
    }

    if (addresses !== prevState.addresses) {
      this.loadBalances();
    }
  }

  public render() {
    const { isLocked, ledgerConnecting, walletTranslations } = this.props;

    return (
      <div className="HydroSDK-ledger">
        {this.renderContent()}
        {isLocked && (
          <button
            className="HydroSDK-button HydroSDK-submitButton HydroSDK-featureButton"
            disabled={ledgerConnecting}
            onClick={() => this.connectLedger()}>
            {ledgerConnecting ? <i className="HydroSDK-fa fa fa-spinner fa-spin" /> : null}{" "}
            {walletTranslations.connectLedger}
          </button>
        )}
      </div>
    );
  }

  private renderContent() {
    const { isLocked, walletTranslations, copyCallback } = this.props;
    if (isLocked) {
      return (
        <NotSupport
          iconName="ledger"
          title={walletTranslations.connectLedger}
          desc={walletTranslations.connectTrezorDesc}
        />
      );
    }
    const { loading, currentAddress, pathType } = this.state;
    const addressOptions = this.getAddressOptions();
    const pathOptions = this.getPathOptions();

    return (
      <>
        <div className="HydroSDK-fieldGroup">
          <div className="HydroSDK-label">{walletTranslations.selectPath}</div>
          <Select options={pathOptions} selected={pathType} onSelect={this.selectPath} />
        </div>
        {pathType === Trezor.CUSTOMIZAION_PATH && this.renderCustomizedPath()}
        <div className="HydroSDK-fieldGroup">
          <div className="HydroSDK-label">
            {walletTranslations.selectAddress}{" "}
            {currentAddress && (
              <i
                className="HydroSDK-copy HydroSDK-fa fa fa-clipboard"
                onClick={async () => {
                  if (currentAddress) {
                    await copy(currentAddress);
                    if (copyCallback) {
                      copyCallback(currentAddress);
                    } else {
                      alert("Copied to clipboard!");
                    }
                  }
                }}
              />
            )}
          </div>
          <Select
            options={addressOptions}
            selected={!loading && currentAddress}
            noCaret={addressOptions.length === 0}
            disabled={addressOptions.length === 0}
            footer={this.renderFooter()}
            blank={
              loading || addressOptions.length === 0 ? (
                <i className="fa fa-spinner fa-spin" />
              ) : (
                walletTranslations.pleaseSelectAddress
              )
            }
          />
        </div>
      </>
    );
  }

  private renderCustomizedPath() {
    const { realPath, loading } = this.state;
    const { walletTranslations } = this.props;
    return (
      <div className="HydroSDK-fieldGroup">
        <div className="HydroSDK-label">{walletTranslations.inputPath}</div>
        <div className="HydroSDK-customizationInputGroup">
          <span>{Trezor.PREFIX_ETHEREUM_PATH}</span>
          <input
            className="HydroSDK-input"
            placeholder={"0'/0"}
            value={realPath.replace(Trezor.PREFIX_ETHEREUM_PATH, "")}
            onChange={this.handleChangeCustomizedPath}
          />
          <button
            className="HydroSDK-button HydroSDK-featureButton"
            disabled={loading}
            onClick={() => this.loadAddresses()}>
            {loading ? <i className="HydroSDK-fa fa fa-spinner fa-spin" /> : null} Load Accounts
          </button>
        </div>
      </div>
    );
  }

  private handleChangeCustomizedPath = (event: React.ChangeEvent<HTMLInputElement>) => {
    const path = event.target.value;
    const realPath = `${Trezor.PREFIX_ETHEREUM_PATH}${path}`;
    this.setState({ realPath });
  };

  private selectPath = (selectedOption: Option) => {
    const pathType = selectedOption.value;
    if (pathType !== Trezor.CUSTOMIZAION_PATH) {
      this.setState({ realPath: pathType });
    }
    this.setState({ pathType });
  };

  private getPathOptions() {
    return [
      {
        value: Trezor.PATH_TYPE.WAN,
        component: <div className="HydroSDK-pathItem">(WAN) (m/44'/5718350'/0'/0)</div>
      },
      {
        value: Trezor.CUSTOMIZAION_PATH,
        component: <div className="HydroSDK-pathItem">Customization</div>
      }
    ];
  }

  private getAddressOptions() {
    const { addresses, balances } = this.state;
    const addressOptions: Option[] = [];
    Object.keys(addresses).map((path: string) => {
      const address = addresses[path];
      const balance = balances[address];
      addressOptions.push({
        value: address,
        component: (
          <div className="HydroSDK-address-option">
            <span>
              <i className="HydroSDK-fa fa fa-check" />
              {truncateAddress(address)}
            </span>
            <span>
              {balance ? (
                balance.div("1000000000000000000").toFixed(5)
              ) : (
                <i className="HydroSDK-fa fa fa-spinner fa-spin" />
              )}{" "}
              WAN
            </span>
          </div>
        ),
        onSelect: () => {
          this.selectAccount(address, path);
        }
      });
    });
    return addressOptions;
  }

  private renderFooter() {
    const { currentPage, gotoPageInputValue } = this.state;
    return (
      <>
        <ReactPaginate
          key={currentPage}
          initialPage={currentPage}
          previousLabel={"<"}
          nextLabel={">"}
          breakLabel={"..."}
          pageCount={10000}
          marginPagesDisplayed={0}
          pageRangeDisplayed={2}
          onPageChange={this.changePage}
          containerClassName={"HydroSDK-pagination"}
          breakClassName={"break-me"}
          activeClassName={"active"}
        />
        <div className="HydroSDK-paginationGotoPage">
          Go to page
          <form onSubmit={this.gotoPageSubmit}>
            <input
              className="HydroSDK-input"
              type="number"
              min="1"
              step="1"
              value={gotoPageInputValue}
              onChange={event => this.setState({ gotoPageInputValue: parseInt(event.target.value, 10) })}
            />
          </form>
        </div>
      </>
    );
  }

  private gotoPageSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { gotoPageInputValue } = this.state;
    const pageNumber = Number(gotoPageInputValue) - 1;
    this.setState({
      currentPage: pageNumber,
      index: pageNumber * batchCount
    });
  };

  private changePage = ({ selected }: { [key: string]: any }) => {
    this.setState({
      currentPage: selected,
      index: selected * batchCount
    });
  };

  private async loadAddresses() {
    const { wallet } = this.props;
    if (!wallet) {
      return;
    }
    const { realPath, index } = this.state;
    this.setState({ loading: true });
    const addresses = await wallet.getAddressesWithPath(realPath, index, batchCount);
    this.setState({ addresses, loading: false });
  }

  public selectAccount(address: string, path: string) {
    const parts = path.split("/");
    const pathType = parts.slice(0, parts.length - 1).join("/");
    const index = parseInt(parts[parts.length - 1], 10);
    this.props.dispatch(selectAccount(Trezor.TYPE, Trezor.TYPE));
    Trezor.setPath(pathType, index);
    this.setState({ currentAddress: address });
  }

  private async connectLedger() {
    const { dispatch } = this.props;
    dispatch(selectAccount(Trezor.TYPE, Trezor.TYPE));
    await dispatch(loadLedger());
    const pathType = Trezor.getPathType(Trezor.currentBasePath);
    this.setState({
      pathType,
      realPath: Trezor.currentBasePath
    });
  }
  private loadBalances() {
    const { addresses } = this.state;
    Object.keys(addresses).map(async (path: string) => {
      let { balances } = this.state;
      const address = addresses[path];
      const balance = await getBalance(address);
      balances[address] = new BigNumber(String(balance));
      this.setState({ balances });
      this.forceUpdate();
    });
  }
}

export default connect(mapStateToProps)(TrezorConnector);
