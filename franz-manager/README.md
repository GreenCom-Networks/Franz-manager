# Franz-manager

### Environment variables
#### Mandatory environment variables
* `SERVER_URL`: The URL of the api (exemple: http://localhost:8080/)
* `WEBSOCKET_SERVER_URL`: The URL of the websocket server (exemple: [ws://localhost:8080/](ws://localhost:8080/))

#### Optional
* `FRONT_BASEPATH`: (default: /)

### Deployment
#### Development
Build: `npm i`
Run: `SERVER_URL='http://0.0.0.0:8080/' WEBSOCKET_SERVER_URL='ws://0.0.0.0:8080/' npm start`
A development webserver should be started, with hot reload on code modification, and a browser tab should be open with the dashboard of the application.

#### Docker
##### From sources
Build: `docker build . -t franz-manager`
Run: `docker run -e SERVER_URL='http://0.0.0.0:8080/' -e WEBSOCKET_SERVER_URL='ws://0.0.0.0:8080/' -p 80:80 franz-manager`
The frontend should be available on http://localhost/

##### From docker hub
Run: `docker pull greencomnetworks/franz-manager && docker run -e SERVER_URL='http://0.0.0.0:8080/' -e WEBSOCKET_SERVER_URL='ws://0.0.0.0:8080/' -p 80:80 greencomnetworks/franz-manager`
The frontend should be available on http://localhost/
