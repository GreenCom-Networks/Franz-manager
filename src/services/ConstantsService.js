const serverUrl = `${SERVER_URL}`;
const websocketServerUrl = `${WEBSOCKET_SERVER_URL}`;

export default {
  apis: {
    franzManagerApi: {
      url: eval('serverUrl ? serverUrl : `${window.location.origin}/franz-manager-api`'),
      webSocketUrl: eval('websocketServerUrl ? websocketServerUrl : `wss://${window.location.host}:5443/franz-manager-api`')
	},
    },
};
