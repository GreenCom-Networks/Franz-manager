import React, { Component } from 'react';
import { Link, withRouter } from 'react-router-dom';
import ClusterBar from '../clusterBar/ClusterBar';
import { Logo } from '../../services/SvgService';
import ClustersService from '../../services/ClustersService';

const sidenavItems = [
  {
    label: 'Dashboard',
    link: '/dashboard',
  },
  {
    label: 'Cluster',
    link: '/cluster',
  },
  {
    label: 'Topics',
    link: '/topics',
  },
  {
    label: 'Consumers',
    link: '/consumers',
  },
];

class Topnav extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedSidenavItem: '',
      subLocation: '',
      previousRoute: '',
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
      selectedSidenavItem: selectedSidenavItem || sidenavItems[0],
      subLocation: splittedPath[2] || '',
      // needed condition in case of page refresh.
      previousRoute: this.state.currentRoute !== location.pathname + location.search ? this.state.currentRoute : this.state.previousRoute,
      currentRoute: location.pathname + location.search,
    });
  }

  render() {
    return (
      <header className="top-header flex">
        <Link to="">
          <div className="logo pointer">
            <Logo/>
          </div>
        </Link>

        <div className="breadcrumb flex-1">
          <div>
            <div className="flex margin-bottom-4px">
              <Link
                className="item"
                to="/dashboard"
              >
                Cluster
                {' '}
                {ClustersService.getSelectedClusterId()}
              </Link>
              {this.state.subLocation && <Link className="item"
                                               to={this.state.previousRoute || this.state.selectedSidenavItem.link}>{this.state.selectedSidenavItem.label}</Link>}
            </div>
            <h1>{this.state.subLocation || this.state.selectedSidenavItem.label}</h1>
          </div>
        </div>

        {/* {this.state.selectedSidenavItem !== 'Dashboard' && <ClusterBar/>} */}
        <ClusterBar/>
      </header>
    );
  }
}

export default withRouter(Topnav);
