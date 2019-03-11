# Franz-manager
A multi-cluster Kafka Administration Tool (front-end).
This application is a smooth alternative to kafka-manager.  
Discover more at [franz-manager.io](https://www.franz-manager.io/) !  

#### Features:
- Multiple clusters management.
- Inspect cluster state (topics, consumers, offsets, brokers, replicas, settings).
- Topics listing.
- Topics creation / deletion.
- Detailed topic information with edition (metrics, settings, partitions, consumers, last messages).
- Consumers listing.
- Live consumption.
- Bulk topic deletion.
- Detailed consumer information (partitions, topic offset, consumer offset, lag, commit timestamp).
- Multiple themes.

### Screenshots
###### Dashboard view
![dashboard view](https://github.com/GreenCom-Networks/franz-manager/blob/master/documentation/images/dashboard_view.jpg?raw=true)
###### Cluster view (theme cashmachine)
![cluster view](https://github.com/GreenCom-Networks/franz-manager/blob/master/documentation/images/cluster_view.jpg?raw=true)
###### Cluster view (theme terminal)
![cluster view](https://github.com/GreenCom-Networks/franz-manager/blob/master/documentation/images/cluster_view_terminal.jpg?raw=true)
###### Cluster view (theme ratatouille)
![cluster view](https://github.com/GreenCom-Networks/franz-manager/blob/master/documentation/images/cluster_view_ratatouille.jpg?raw=true)
###### Topics view
![topics view](https://github.com/GreenCom-Networks/franz-manager/blob/master/documentation/images/topics_view.jpg?raw=true)
###### Topic view
![topic view](https://github.com/GreenCom-Networks/franz-manager/blob/master/documentation/images/topic_view.jpg?raw=true)
###### Consumer view
![consumer view](https://github.com/GreenCom-Networks/franz-manager/blob/master/documentation/images/consumer_view.jpg?raw=true)

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
