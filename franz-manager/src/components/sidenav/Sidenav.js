import React, { Component } from 'react';
import classnames from 'classnames';
import PropTypes from 'prop-types';

import Ink from 'react-ink';
import { Link, withRouter } from 'react-router-dom';
import {
  DashboardIcon, ClusterIcon, TopicsIcon, ConsumerIcon,
} from '../../services/SvgService';
import themes from '../../assets/themes/themes';
import ThemesStore from '../../stores/ThemesStore';
import Menu from '../menu/Menu';
import Option from '../menu/option/Option';

const sidenavItems = [
  {
    label: 'Dashboard',
    link: '/dashboard',
    icon: <DashboardIcon/>,
  }, {
    label: 'Cluster',
    link: '/cluster',
    icon: <ClusterIcon/>,
  }, {
    label: 'Topics',
    link: '/topics',
    icon: <TopicsIcon/>,
  }, {
    label: 'Consumers',
    link: '/consumers',
    icon: <ConsumerIcon/>,
  },
];

class Sidenav extends Component {

  constructor(props) {
    super(props);
    this.themeRef = React.createRef();

    this.state = {
      selectedSidenavItem: '',
      selectedTheme: ThemesStore.getTheme().file,
      currentRoute: this.props.location.pathname + this.props.location.search,
    };

    this.props.history.listen(location => {
      this._updateRoute(location);
    });
  }

  componentDidMount() {
    this._updateRoute(this.props.location);
  }

  _updateRoute(location) {
    const baseUrl = document.querySelectorAll('base')[0].attributes['href'].value;
    const splittedPath = location.pathname.replace(baseUrl, '')
      .split('/');
    const selectedSidenavItem = sidenavItems.find(m => m.link.split('/')[1] === splittedPath[1]);
    this.setState({
      selectedSidenavItem: selectedSidenavItem ? selectedSidenavItem.label : sidenavItems[0].label,
      subLocation: splittedPath[2] || '',
      previousRoute: this.state.currentRoute,
      currentRoute: location.pathname + location.search,
    });
  }

  _selectSidenavItem(sidenavItem) {
    this.setState({ selectedSidenavItem: sidenavItem.label });
  }

  _switchTheme(theme) {
    ThemesStore.updateTheme(theme);
    this.setState({ selectedTheme: theme.file });
  }

  render() {
    return (
      <div className="sidebar">
        <div className="sidenav-items">
          {
            sidenavItems.map(sidenavItem => (
              <Link
                to={sidenavItem.link}
                onClick={this._selectSidenavItem.bind(this, sidenavItem)}
                key={sidenavItem.link}
                className={classnames('sidenav-item', {
                  selected: sidenavItem.label === this.state.selectedSidenavItem,
                })}
              >
                {sidenavItem.icon}
                <span className="label">{sidenavItem.label}</span>
                <Ink/>
              </Link>
            ))
          }
        </div>

        <Menu className="theme-menu" label="Theme" selected={this.state.selectedTheme} ref={this.themeRef}
              onChange={this._switchTheme.bind(this)}>
          {
            themes.map(theme => (
              <Option onChange={this._switchTheme.bind(this)} value={theme} ref={theme.file} key={theme.file}
                      selected={this.state.selectedTheme.replace('theme-', '') === theme.file.replace('theme-', '')}>
                {theme.file.replace('theme-', '')}
              </Option>
            ))
          }

        </Menu>
      </div>
    );
  }
}

export default withRouter(Sidenav);
