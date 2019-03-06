import React, { Component } from 'react';
import PropTypes from 'prop-types';

import Ink from 'react-ink';
import classnames from 'classnames';

class Menu extends Component {
  static propTypes = {
    children: PropTypes.arrayOf(PropTypes.element).isRequired,
    onChange: PropTypes.func,
    label: PropTypes.string.isRequired,
    className: PropTypes.string,
  };

  static defaultProps = {
    className: '',
    onChange: () => {},
  };

  constructor(props) {
    super(props);

    this.ref = React.createRef();

    this.state = {
      open: false,
    };
  }

  componentDidMount() {
    document.addEventListener('mousedown', this._handleClickOutside.bind(this));
  }


  componentDidUpdate() {
    const dropdownBouding = this.ref.current.getBoundingClientRect();

    if (dropdownBouding.y + dropdownBouding.height + 24 > window.innerHeight) {
      this.ref.current.classList.add('reversed-menu');
    }
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this._handleClickOutside.bind(this));
  }

  _handleClickOutside(event) {
    if (this.wrapperRef && !this.wrapperRef.contains(event.target)) {
      this._close();
    }
  }

  _setWrapperRef(node) {
    this.wrapperRef = node;
  }

  _selectOption(option) {
    this.props.onChange(option);
  }

  _toggle() {
    const { open } = this.state;
    this.setState({ open: !open });
  }

  _close() {
    this.setState({ open: false });
  }

  _calcDropDownPosition() {
    if (this.ref.current) {
      const dropdownBouding = this.ref.current.getBoundingClientRect();
      if (this.ref.current.classList.contains('reversed-menu')) {
        return {
          top: -8 - dropdownBouding.height,
        };
      }
    }
    return {};
  }

  render() {
    const dropDownStyle = this._calcDropDownPosition();
    const { children } = this.props;
    const childrenWithProps = React.Children.map(children, child => React.cloneElement(child, { closeMenu: this._close.bind(this) }));

    return (
      <div
        className={classnames({ open: this.state.open }, 'dropdown-menu', this.props.className)}
        ref={this._setWrapperRef.bind(this)}
      >
        <button type="button" className="dropdown-menu-trigger" onClick={this._toggle.bind(this)}>
          {this.props.label}
          <i className="mdi mdi-24px mdi-chevron-down" />
          <Ink />
        </button>
        <div className="dropdown-menu-content" ref={this.ref} style={dropDownStyle}>
          {childrenWithProps}
        </div>
      </div>
    );
  }
}

export default Menu;
