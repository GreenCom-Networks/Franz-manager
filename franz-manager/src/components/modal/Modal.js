import React from 'react';
import { PortalWithState } from 'react-portal';
import '../../core.scss';
import Ink from 'react-ink';
import PropTypes from 'prop-types';

class Modal extends React.Component {
  static propTypes = {
    className: PropTypes.string,
    title: PropTypes.string.isRequired,
    children: PropTypes.any,
    actions: PropTypes.arrayOf(PropTypes.any),
    close: PropTypes.func.isRequired,
  };

  static defaultProps = {
    className: '',
    children: null,
    actions: [],
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
      <div className={`modal component ${this.props.className || ''}`}>
        <div className="content">
          <header>
            <h2>{this.props.title}</h2>

            {this.props.actions && this.props.actions.map(a => (
              <button
                type="button"
                className="toggle margin-left-16px"
                onClick={a.action}
              >
                {a.label}
              </button>
            ))}

            <button
              type="button"
              onClick={this.props.close}
            >
              <i className="mdi mdi-24px mdi-close" />
              <Ink />
            </button>
          </header>
          <PortalWithState isOpen>
            {() => this.props.children}
          </PortalWithState>
        </div>
      </div>
    );
  }
}

export default Modal;
