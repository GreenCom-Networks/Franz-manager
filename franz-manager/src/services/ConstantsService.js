const serverUrl = process.env.SERVER_URL;
const websocketServerUrl = process.env.WEBSOCKET_SERVER_URL;

export default {
  apis: {
    franzManagerApi: {
      url: eval('serverUrl ? serverUrl : `${window.location.origin}/franz-manager-api`'),
      webSocketUrl: eval('websocketServerUrl ? websocketServerUrl : `wss://${window.location.origin}/franz-manager-api`')
	},
    },
};
