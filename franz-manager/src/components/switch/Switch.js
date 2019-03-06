import React, { Component } from 'react';

import classnames from 'classnames';
import Ink from 'react-ink';
import PropTypes from 'prop-types';

class Switch extends Component {
  static propTypes = {
    value: PropTypes.bool,
    className: PropTypes.string,
    label: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
  };

  static defaultProps = {
    value: false,
    className: '',
  };

  constructor(props) {
    super(props);

    this.state = {
      value: typeof this.props.value === 'boolean' ? this.props.value : false,
    };
  }

  _toggle() {
    const { value } = this.state;
    if (this.props.onChange) {
      this.props.onChange(!value);
    }
    this.setState({ value: !value });
  }

  render() {
    return (
      <div className={`switch-wrapper ${this.props.className}`}>
        <div className="switch-label">{this.props.label}</div>
        <div className={classnames({ on: this.state.value }, 'switch')} onClick={this._toggle.bind(this)}>
          <span className="switch-value">{this.state.value ? 'ON' : 'OFF'}</span>
          <div className="switch-handle ellipse" />
          <Ink />
        </div>
      </div>
    );
  }
}

export default Switch;
