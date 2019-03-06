import ApiService from './ApiService';

export default {
  getBrokers(clusterId = null, withConfiguration = false) {
    return new Promise((resolve, reject) => {
      ApiService.requestFranzManagerApi('GET', '/brokers', null, { withConfiguration }, clusterId)
        .then(resolve)
        .catch(reject);
    });
  },

  getBrokersDetails(brokerId) {
    return new Promise((resolve, reject) => {
      ApiService.requestFranzManagerApi('GET', `/brokers/${brokerId}`)
        .then(resolve)
        .catch(reject);
    });
  },
};
