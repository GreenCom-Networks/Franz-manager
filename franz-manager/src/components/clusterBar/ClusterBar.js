import React, { Component } from 'react';
import ClustersService from '../../services/ClustersService';
import Menu from '../menu/Menu';
import Option from '../menu/option/Option';

class ClusterBar extends Component {
  constructor(props) {
    super(props);
    this.clusterSelect = React.createRef();

    this.state = {
      clusters: [],
      currentCluster: null,
    };
  }

  componentDidMount() {
    ClustersService.getClusters()
      .then(clusters => {
        ClustersService.getSelectedCluster()
          .then(currentCluster => {
            this.setState({
              clusters,
              currentCluster
            });
          });
      });
  }

  _changeCluster(clusterId) {
    const cluster  = this.state.clusters.find(c => c.name === clusterId);
    if(cluster) {
      this.setState({ currentCluster: cluster });
      ClustersService.setSelectedClusterId(cluster.name);
    }
    window.location.reload(true); // Full reload on cluster change
  }

  render() {
    const clusters = this.state.clusters;
    const currentCluster = this.state.currentCluster;
    return (
      <Menu
        label={currentCluster ? `Cluster ${currentCluster.name}` : ''}
        selected={this.state.selected}
        ref={this.clusterSelect}
        onChange={this._changeCluster.bind(this)}
      >
        {clusters.map(cluster => (
          <Option
            onChange={this.clusterSelect.current._selectOption.bind(this.clusterSelect.current)}
            value={cluster.name}
            ref={cluster.name}
            key={cluster.name}
            selected={currentCluster ? currentCluster.name === cluster.name : false}
            className="flex align-center space-between"
          >
            Cluster {cluster.name}
            <i className="ellipse-8px ellipse green" />
          </Option>
        ))}
      </Menu>

    );
  }
}

export default ClusterBar;
