import React from 'react';
import { PortalWithState } from 'react-portal';
import PropTypes from 'prop-types';

import './styles.css';

class Modal extends React.Component {
  static propTypes = {
    className: PropTypes.string,
    children: PropTypes.arrayOf(PropTypes.element).isRequired,
  };

  static defaultProps = {
    className: '',
  };

  constructor(props) {
    super(props);
    this.id = Math.random()
      .toFixed(0);
  }

  componentDidMount() {
  }

  componentWillUnmount() {
  }

  render() {
    return (
      <div className={`modal-component ${this.props.className}`}>
        <div className="content">
          <PortalWithState isOpen>
            {() => this.props.children}
          </PortalWithState>
        </div>
      </div>
    );
  }
}

export default Modal;
