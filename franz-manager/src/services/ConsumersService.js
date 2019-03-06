import ApiService from './ApiService';

export default {
  getConsumers(groupId, topicId) {
    const queryParams = {};
    if (groupId) {
      queryParams.group = groupId;
    }
    if (topicId) {
      queryParams.topic = topicId;
    }
    return new Promise((resolve, reject) => {
      ApiService.requestFranzManagerApi('GET', '/consumers', null, queryParams)
        .then(resolve)
        .catch(reject);
    });
  },
};
