import React, { Component } from 'react';
import classnames from 'classnames';
import PropTypes from 'prop-types';
import Switch from '../switch/Switch';

class Filter extends Component {
  static propTypes = {
    onChange: PropTypes.func.isRequired,
    className: PropTypes.string,
    value: PropTypes.string,
    filterByRegexp: PropTypes.bool,
  };

  static defaultProps = {
    className: '',
    value: '',
    filterByRegexp: false,
  };

  constructor(props) {
    super(props);

    this.state = {
      filter: this.props.value || '',
      filterByRegexp: this.props.filterByRegexp || false,
    };
  }

  _updateFilter(e) {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    const filters = {
      filter: e.target.value,
      filterByRegexp: this.state.filterByRegexp,
    };
    this.setState(filters);
    this.timeout = setTimeout(() => {
      this.props.onChange(filters);
    }, 250);
  }

  _updateRegexp() {
    const filters = {
      filter: this.state.filter,
      filterByRegexp: !this.state.filterByRegexp,
    };
    this.setState(filters);
    this.props.onChange(filters);
  }

  render() {
    return (
      <div
        className={classnames('filter', 'component', 'flex', 'flex-1', this.props.className || '')}
      >
        <input
          onChange={this._updateFilter.bind(this)}
          value={this.state.filter}
          type="text"
          placeholder={this.props.placeholder || 'filter'}
          className={classnames({ regex: this.state.filterByRegexp }, 'flex-1', 'margin-left-32px')}
        />

        {!this.props.disableRegexp && <Switch
          className="reg"
          onChange={this._updateRegexp.bind(this, 'Regex')}
          value={this.state.filterByRegexp}
          label="Regex"
        />}

      </div>
    );
  }
}

export default Filter;
