import React, { Component } from 'react';
import { Link, withRouter } from 'react-router-dom';
import ClusterBar from '../clusterBar/ClusterBar';
import Sidenav from '../sidenav/Sidenav';
import { Logo } from '../../services/SvgService';
import ClustersService from '../../services/ClustersService';


class Topnav extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedSidenavItem: null,
      relativePath: '',
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
    const basePath = document.querySelector('base').attributes['href'].value;
    let relativePath = location.pathname.replace(basePath, '');
    if(!relativePath.startsWith('/')) relativePath = '/' + relativePath;
    const selectedSidenavItem = Sidenav.items.find(i => relativePath.startsWith(i.link));
    
    let subLocation = '';
    if(selectedSidenavItem && relativePath.startsWith(selectedSidenavItem.link + '/')) {
      subLocation = relativePath.replace(selectedSidenavItem.link + '/', '');
    }
    
    const currentRoute = location.pathname + location.search;
    const previousRoute = currentRoute !== this.state.currentRoute ? this.state.currentRoute : this.state.previousRoute;
    
    this.setState({
      selectedSidenavItem,
      relativePath,
      subLocation: subLocation,
      // needed condition in case of page refresh.
      previousRoute,
      currentRoute
    });
  }

  render() {
    const selectedSidenavItem = this.state.selectedSidenavItem || {};
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
              <Link className="item" to="/dashboard">
                { 'Cluster ' + ClustersService.getSelectedClusterId() }
              </Link>
              { this.state.subLocation &&
               (<Link className="item"
                      to={this.state.previousRoute || selectedSidenavItem.link}>{selectedSidenavItem.label}</Link>) }
            </div>
            <h1>{this.state.subLocation || selectedSidenavItem.label}</h1>
          </div>
        </div>
        <ClusterBar/>
      </header>
    );
  }
}

export default withRouter(Topnav);
