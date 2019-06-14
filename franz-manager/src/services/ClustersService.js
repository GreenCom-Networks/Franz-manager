import ApiService from './ApiService';


let _clusters = null;
let _clusterPromise = null;

export default class ClustersService {
  static getClusters() {
    if(_clusters) return Promise.resolve(_clusters);
    if(_clusterPromise) return _clusterPromise;
    _clusterPromise = ApiService.requestFranzManagerApi('GET', '/clusters')
      .then(clusters => {
        _clusters = clusters;
        _clusterPromise = null;
        return clusters;
      });
    return _clusterPromise;
  }

  static getSelectedClusterId() {
    return window.localStorage.getItem('selectedClusterId');
  }

  static setSelectedClusterId(clusterId) {
    window.localStorage.setItem('selectedClusterId', clusterId);
  }

  static clearSelectedClusterId() {
    window.localStorage.removeItem('selectedClusterId');
  }

  static getSelectedCluster() {
    return ClustersService.getClusters().then(clusters => {
      function selectDefaultCluster() {
        const cluster = clusters[0];
        if(cluster) {
          ClustersService.setSelectedClusterId(cluster.name);
        } else {
          ClustersService.clearSelectedClusterId();
        }
        return cluster;
      }

      const selectedClusterId = ClustersService.getSelectedClusterId();
      if(!selectedClusterId) {
        return selectDefaultCluster();
      }
      const cluster = clusters.find(c => c.name === selectedClusterId);
      if(!cluster) {
        return selectDefaultCluster();
      }

      return cluster;
    });
  }
};
