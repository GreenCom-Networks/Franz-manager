import React from 'react';
import PropTypes from 'prop-types';
import './styles.css';

const defaultToggleButton = (
  <svg className="icon" viewBox="0 0 24 24" width="24px">
    <circle cx="4" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="20" cy="12" r="2" />
  </svg>
);

class Menu extends React.Component {
  static propTypes = {
    toggleButton: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.element,
    ]),
    children: PropTypes.arrayOf(PropTypes.element).isRequired,
  };

  static defaultProps = {
    toggleButton: null,
  };

  constructor(props) {
    super(props);

    this.rootRef = React.createRef();

    this.id = Math.random()
      .toFixed(0);
    this.state = {
      hideContent: true,
      position: {},
    };
  }

  componentDidMount() {
  }

  componentWillUnmount() {
  }

  _toggleMenu(e) {
    if (this.state.hideContent) {
      this.rootRef.className = 'menu-content active';
      this.setState({
        hideContent: false,
        position: e.target.getBoundingClientRect(),
      });
    } else {
      this.rootRef.className = 'menu-content';
      this.setState({
        hideContent: true,
        position: {},
      });
    }
  }

  render() {
    let children = [];
    if (this.props.children) {
      children = Array.isArray(this.props.children) ? this.props.children : [this.props.children];
    }
    const menuContentStyle = {};
    if (this.state.position.top && this.state.position.right) {
      menuContentStyle.top = 15;
      menuContentStyle.right = 15;
    }
    return (
      <div className="menu">
        <span
          className="menu-toggle-button"
          onClick={this._toggleMenu.bind(this)}
        >
          {this.props.toggleButton || defaultToggleButton}
        </span>
        <div ref={this.rootRef} className="menu-content" style={menuContentStyle}>
          <ul>
            {children.map((child, index) => {
              const clonedChild = React.cloneElement(child, {
                ...child.props,
                closeMenu: this._toggleMenu.bind(this),
              });
              return <li key={index}>{clonedChild}</li>;
            })}
          </ul>
        </div>
      </div>
    );
  }
}

export default Menu;
