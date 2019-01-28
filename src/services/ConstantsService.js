const serverUrl = `${SERVER_URL}`;
const websocketServerUrl = `${WEBSOCKET_SERVER_URL}`;

export default {
    apis: {
	franzManagerApi: {
	    url: serverUrl ? serverUrl : `${window.location.origin}/franz-manager-api`,
	    webSocketUrl: websocketServerUrl ? websocketServerUrl : `wss://${window.location.host}:5443/franz-manager-api`
	},
    },
};
