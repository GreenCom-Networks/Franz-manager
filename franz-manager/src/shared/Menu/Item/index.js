import React from 'react';
import PropTypes from 'prop-types';
import './styles.css';

class Item extends React.Component {
  static propTypes = {
    label: PropTypes.string.isRequired,
    selected: PropTypes.bool,
    closeMenu: PropTypes.func,
    onClick: PropTypes.func,
  };

  static defaultProps = {
    selected: false,
    closeMenu: null,
    onClick: null,
  };

  render() {
    return (
      <span
        className="menu-item"
        onClick={() => {
          if (this.props.onClick) {
            this.props.onClick();
          }
          if (this.props.closeMenu) {
            this.props.closeMenu();
          }
        }}
      >
        {this.props.label}
        {this.props.selected && (
          <span className="menu-item-selected-icon">
            <svg
              className="icon"
              viewBox="0 0 8 8"
              width="8px"
              style={{
                float: 'right',
                marginTop: 18,
              }}
            >
              <circle cx="4" cy="4" r="4" fill="#5D83D9" />
            </svg>
          </span>
        )}
      </span>
    );
  }
}

export default Item;
