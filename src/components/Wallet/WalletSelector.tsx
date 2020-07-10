import * as React from "react";
import Select, { Option } from "./Select";
import { truncateAddress } from "../../wallets";
import { AccountState, WalletState } from "../../reducers/wallet";
import { connect } from "react-redux";
import { selectAccount } from "../../actions/wallet";
import { BigNumber } from "ethers-wan/utils";
import copy from "clipboard-copy";

interface Props {
  walletType: string;
  selectedAccountID: string | null;
  accounts: any;
  dispatch: any;
  walletTranslations: { [key: string]: any };
  unit: string;
  decimals: number;
  selectedAccountAddress: string | null;
  copyCallback?: (text: string) => any;
}

interface State { }

const mapStateToProps = (state: any) => {
  const walletState: WalletState = state.WalletReducer;
  const selectedAccountID = walletState.get("selectedAccountID");
  const accounts = walletState.get("accounts");
  return {
    accounts,
    selectedAccountID,
    selectedAccountAddress: accounts.getIn([selectedAccountID, "address"], null),
    walletTranslations: walletState.get("walletTranslations"),
    unit: walletState.get("unit"),
    decimals: walletState.get("decimals")
  };
};

class WalletSelector extends React.PureComponent<Props, State> {
  public render() {
    const { selectedAccountID, walletTranslations, selectedAccountAddress, copyCallback, walletType } = this.props;

    const options = this.getOptions();

    let blankText;
    if (options.length === 0) {
      blankText = walletTranslations.noAvailableAddress;
    } else {
      blankText = walletTranslations.pleaseSelectAddress;
    }

    return (
      <>
        <div className="WanchainSDK-fieldGroup">
          <div className="WanchainSDK-label">
            {walletTranslations.selectAddress}
            <i
              className="WanchainSDK-copy WanchainSDK-fa fa fa-clipboard"
              onClick={async () => {
                if (selectedAccountAddress) {
                  await copy(selectedAccountAddress);
                  if (copyCallback) {
                    copyCallback(selectedAccountAddress);
                  } else {
                    alert("Copied to clipboard!");
                  }
                }
              }}
            />
          </div>
          <Select
            blank={blankText}
            noCaret={options.length === 0}
            disabled={options.length === 0}
            options={options}
            selected={selectedAccountID || ""}
          />
          <div className="WanchainSDK-selected-address">
            {"Address: "} {selectedAccountAddress}
            <i
              className="WanchainSDK-copy WanchainSDK-fa fa fa-clipboard"
              onClick={async () => {
                if (selectedAccountAddress) {
                  await copy(selectedAccountAddress);
                  if (copyCallback) {
                    copyCallback(selectedAccountAddress);
                  } else {
                    alert("Copied to clipboard!");
                  }
                }
              }}
            />
          </div>
        </div>
      </>
    );
  }

  private getOptions(): Option[] {
    const { walletType, dispatch, unit, decimals, walletTranslations } = this.props;

    const options: Option[] = [];

    this.getWalletAccounts(walletType).forEach((account: AccountState, accountID: string) => {
      const text = account.get("address");
      const isLocked = account.get("isLocked");
      const balance = account.get("balance");
      const wallet = account.get("wallet");
      if (text) {
        options.push({
          value: accountID,
          component: (
            <div className="WanchainSDK-address-option">
              <span>
                {isLocked ? <i className="WanchainSDK-fa fa fa-lock" /> : <i className="WanchainSDK-fa fa fa-check" />}
                {truncateAddress(text)}
              </span>
              <span style={{marginLeft:"20px", marginRight:"20px"}}>
                <i>{walletTranslations.clickToUpdateBalance}</i>
              </span>
              <span>
                {balance.div(new BigNumber(10).pow(decimals).toString()).toFixed(5)} {unit}
              </span>
            </div>
          ),
          onSelect: (option: Option) => {
            dispatch(selectAccount(option.value, wallet.type()));
          }
        });
      }
    });
    return options;
  }

  private getWalletAccounts(walletType: string): any {
    const { accounts } = this.props;
    return accounts.filter((account: AccountState) => {
      return account.get("wallet").type() === walletType;
    });
  }
}

export default connect(mapStateToProps)(WalletSelector);
