import React, { Component } from 'react';
import ClustersService from '../../services/ClustersService';
import Menu from '../menu/Menu';
import Option from '../menu/option/Option';

class ClusterBar extends Component {
  constructor(props) {
    super(props);
    this.clusterSelect = React.createRef();

    this.state = {
      selected: null,
      clusters: [],
    };
  }

  componentWillMount() {
    ClustersService.getClusters()
      .then((clusters) => {
        let selectedClusterId = ClustersService.getSelectedClusterId();
        if (!selectedClusterId) {
          ClustersService.setSelectedClusterId(clusters[0].name);
          selectedClusterId = clusters[0].name;
          this.setState({ clusters, selected: selectedClusterId });
          window.location.reload(true);
        } else {
          this.setState({ clusters, selected: selectedClusterId });
        }
      });
  }

  _changeCluster(cluster) {
    this.setState({ selected: cluster });
    ClustersService.setSelectedClusterId(cluster);
    window.location.reload(true);
  }

  render() {
    const clusters = this.state.clusters || [];
    return (
      <Menu
        label={`Cluster ${this.state.selected}`}
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
            selected={this.state.selected}
            className="flex align-center space-between"
          >
                        Cluster
            {' '}
            {cluster.name}
            {' '}
            <i className="ellipse-8px ellipse green" />
          </Option>
        ))}
      </Menu>

    );
  }
}

export default ClusterBar;
