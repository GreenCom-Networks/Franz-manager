import React from 'react';
import PropTypes from 'prop-types';

import { LoaderIcon } from '../../services/SvgService';

class Loader extends React.Component {
  static propTypes = {
    width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  };

  static defaultProps = {
    width: 64,
  };

  constructor(props) {
    super(props);

    this.state = {};

    if (typeof props.width !== 'undefined') {
      this.state.width = props.width;
    } else {
      this.state.width = 64;
    }
  }

  render() {
    return (
      <div className="grid-wrapper loader">
        <div className="grid">
          <LoaderIcon width={this.state.width} />
        </div>
      </div>
    );
  }
}

export default Loader;
