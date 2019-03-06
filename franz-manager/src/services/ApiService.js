import querystring from 'querystring';
import Constants from './ConstantsService';

export default {
  requestFranzManagerApi(method, route, bodyParams = {}, queryParams = {}, clusterId = null) {
    method = method.toLowerCase();
    if(method === 'post' || method === 'put') {
      return fetch(`${Constants.apis.franzManagerApi.url + route}?${querystring.stringify(queryParams)}`, {
	method: method,
	body: bodyParams ? JSON.stringify(bodyParams) : '',
	headers: {
	  'Accept': 'application/json',
	  'Content-Type': 'application/json',
	  'clusterId': clusterId || window.localStorage.getItem('selectedClusterId')
	},
	mode: 'cors'
      }).then(res => {
	if(!res.ok) {
	  throw new Error(res.status);
	}
	// this api is bonkers...
	return res.text().then(str => {
	  if(str) return JSON.parse(str);
	  else return str;
	});
      }).catch(err => {
	console.log(err);
	throw err;
      });
    } else {
      return fetch(`${Constants.apis.franzManagerApi.url + route}?${querystring.stringify(queryParams)}`, {
	method: method,
	headers: {
	  'Accept': 'application/json',
	  'clusterId': clusterId || window.localStorage.getItem('selectedClusterId')
	},
	mode: 'cors'
      }).then(res => {
	if(!res.ok) {
	  throw new Error(res.status);
	}
	// this api is bonkers...
	return res.text().then(str => {
	  if(str) return JSON.parse(str);
	  else return str;
	});
      });

    }
  },

  getApiStatus() {
    return new Promise((resolve, reject) => {
      this.requestFranzManagerApi('GET', '/status')
        .then(resolve)
        .catch(reject);
    });
  },
};
