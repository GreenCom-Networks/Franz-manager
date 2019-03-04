import ApiService from './ApiService';

export default {
  getClusters() {
    return ApiService.requestFranzManagerApi('GET', '/clusters');
    // Is it really important to use the cache here?
/*    return new Promise((resolve, reject) => {
      
      if (localStorage.getItem('clusters')) {
        resolve(JSON.parse(localStorage.getItem('clusters')));
      }

      ApiService.requestFranzManagerApi('GET', '/clusters')
        .then((res) => {
          if (!localStorage.getItem('clusters')) {
            resolve(res);
          }
          window.localStorage.setItem('clusters', JSON.stringify(res));
        })
        .catch(reject);
    });
*/
  },

  getSelectedClusterId() {
    return window.localStorage.getItem('selectedClusterId');
  },

  setSelectedClusterId(clusterId) {
    window.localStorage.setItem('selectedClusterId', clusterId);
  },
};
