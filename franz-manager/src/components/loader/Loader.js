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
  }

  render() {
    return (
      <div className="grid-wrapper loader">
        <div className="grid">
          <LoaderIcon width={this.props.width} />
        </div>
      </div>
    );
  }
}

export default Loader;
