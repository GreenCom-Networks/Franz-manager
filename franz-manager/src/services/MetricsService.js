import ApiService from './ApiService';

export default {
  getMetrics(metricLocation, metricType, metricName, additional) {
    return new Promise((resolve, reject) => {
      const queryParams = { metricLocation, metricType };
      if (additional) {
        queryParams.additional = additional;
      }
      if (metricName) {
        queryParams.metricName = metricName;
      }
      ApiService.requestFranzManagerApi('GET', '/metrics', null, queryParams)
        .then(resolve)
        .catch(reject);
    });
  },
};
