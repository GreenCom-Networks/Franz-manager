import React, { Component } from 'react';
import PropTypes from 'prop-types';

class Loadbar extends Component {
  static propTypes = {
    timer: PropTypes.number,
    finished: PropTypes.bool,
  };

  static defaultProps = {
    timer: 0,
    finished: false,
  };

  constructor(props) {
    super(props);

    this.loadBarRef = React.createRef();

    this.state = {
      currentTime: 0,
    };

    this.interval = setInterval(() => {
      const { currentTime } = this.state;
      this.setState({ currentTime: currentTime + 100 });
      if (this.state.currentTime >= (this.props.timer || 3000)) {
        clearInterval(this.interval);
      }
    }, 100);
  }

  componentWillReceiveProps(props) {
    if (props.finished) {
      this.setState({ currentTime: props.timer });
      setTimeout(() => {
        if (this.loadBarRef.current) {
          this.loadBarRef.current.style.display = 'none';
        }
      }, 300);
    }
  }

  render() {
    return (
      <div className="loadbar-component" ref={this.loadBarRef}>
        <div
          className="fill"
          style={{ width: `${this.state.currentTime / (this.props.timer || 3000) * 100}%` }}
        />
      </div>
    );
  }
}

export default Loadbar;
