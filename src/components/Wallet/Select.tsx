import * as React from "react";

export interface Option {
  value: any;
  text?: string;
  component?: any;
  onSelect?: any;
  hidden?: boolean;
  disabled?: boolean;
}

interface Props {
  options: Option[];
  selected: any;
  onSelect?: any;
  noCaret?: boolean;
  blank?: any;
  formatSelect?: any;
  disabled?: boolean;
  footer?: any;
}

interface State {
  unfolded: boolean;
}

export default class Select extends React.PureComponent<Props, State> {
  private container: any;
  private ps: any;

  constructor(props: Props) {
    super(props);

    this.state = {
      unfolded: false
    };
  }

  private tryFoldListener = (e: Event) => {
    if (this.container && !this.container.contains(e.target)) {
      this.setState({ unfolded: false });
    }
  };

  public componentDidMount() {
    window.document.addEventListener("mouseup", this.tryFoldListener);
  }

  public componentDidUpdate(prevProps: Props) {
  }

  public componentWillUnmount() {
    window.document.removeEventListener("mouseup", this.tryFoldListener);
  }

  private switchFold = () => {
    this.setState({
      unfolded: !this.state.unfolded
    });
  };

  private setContainer = (ref: any) => {
    if (!ref) {
      return;
    }

    this.container = ref;
  };

  private getDropdownDirection(): string {
    if (!this.container) {
      return "down";
    }

    const topDistance = (elem: any) => {
      let location = 0;
      if (elem.offsetParent) {
        do {
          location += elem.offsetTop;
          elem = elem.offsetParent;
        } while (elem);
      }
      return location >= 0 ? location : 0;
    };

    const bottomDistance = window.innerHeight - topDistance(this.container) - this.container.offsetHeight;

    return bottomDistance < 200 ? "up" : "down";
  }

  private renderDropdown() {
    const { options, onSelect, footer } = this.props;
    const items: JSX.Element[] = [];

    for (let option of options) {
      if (option.hidden) {
        continue;
      }

      items.push(
        <div
          key={option.value}
          className="WanchainSDK-item"
          onClick={e => {
            if (option.disabled) {
              return;
            }

            if (onSelect) {
              onSelect(option, e);
            }
            if (option.onSelect) {
              option.onSelect(option, e);
            }
            this.setState({ unfolded: false });
          }}>
          {this.renderOption(option)}
        </div>
      );
    }

    const dropdownClassNames = ["WanchainSDK-dropdown"];
    const direction = this.getDropdownDirection();

    if (direction === "down") {
      dropdownClassNames.push("down");
    } else if (direction === "up") {
      dropdownClassNames.push("up");
    }

    return (
      <div className={dropdownClassNames.join(" ")}>
        {items}
        {footer && <div className="WanchainSDK-selectFooter">{footer}</div>}
      </div>
    );
  }

  private renderOption = (option: Option) => {
    return option.component ? option.component : option.text;
  };

  private renderSelected() {
    let selectOption;
    const { options, selected, formatSelect, noCaret, blank, disabled } = this.props;

    for (let option of options) {
      if (selected === option.value) {
        selectOption = option;
      }
    }

    return (
      <div
        className="WanchainSDK-selected"
        onClick={() => {
          if (!disabled) {
            this.switchFold();
          }
        }}>
        {selectOption ? (formatSelect ? formatSelect(selectOption) : this.renderOption(selectOption)) : blank}
        {noCaret ? null : this.renderCaret()}
      </div>
    );
  }

  private renderCaret() {
    return <div className="WanchainSDK-caret" />;
  }

  public render() {
    const { unfolded } = this.state;

    const classNames = ["WanchainSDK-select"];

    if (unfolded) {
      classNames.push("WanchainSDK-unfolded");
    }

    return (
      <div className={classNames.join(" ")} ref={this.setContainer}>
        {this.renderSelected()}
        {this.renderDropdown()}
      </div>
    );
  }
}
