import React, { Component } from 'react';
import Ink from 'react-ink';
import classnames from 'classnames';
import PropTypes from 'prop-types';

class Option extends Component {
  static propTypes = {
    className: PropTypes.string,
    children: PropTypes.any,
    value: PropTypes.any.isRequired,
    closeMenu: PropTypes.func,
    onChange: PropTypes.func.isRequired,
    selected: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.string,
      PropTypes.bool,
    ]).isRequired,
  };

  static defaultProps = {
    className: '',
    children: null,
    closeMenu: null,
  };

  _selectOption(option) {
    this.props.closeMenu();
    this.props.onChange(option);
  }

  render() {
    return (
      <button
        type="button"
        onClick={this._selectOption.bind(this, this.props.value)}
        className={classnames({
          selected: typeof this.props.selected === 'boolean'
            ? this.props.selected
            : this.props.selected === this.props.value,
        }, this.props.className, 'dropdown-menu-item')}
      >
        {this.props.children}
        <Ink />
      </button>
    );
  }
}

export default Option;
