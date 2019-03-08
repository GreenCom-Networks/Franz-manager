# Franz-manager
A multi-cluster Kafka Administration Tool.
This application is a smooth alternative to kafka-manager.  
Discover more at [franz-manager.io](https://www.franz-manager.io/) !

#### Features:
- Multiple clusters management.
- Inspect cluster state (topics, consumers, offsets, brokers, replicas, settings).
- Topics listing.
- Topics creation / deletion.
- Detailed topic information with edition (metrics, settings, partitions, consumers, last messages).
- Consumers listing.
- Live consumption
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

### Deployment
#### Docker
##### From docker hub with docker-compose
Run: `KAFKA_CONF='[YOUR_KAFKA_CONFIGURATION]' SERVER_URL='http://0.0.0.0:8080/' WEBSOCKET_SERVER_URL='ws://0.0.0.0:8081/' cd deploy && docker-compose up`
The frontend should be available on http://localhost/
The api should be available on http://localhost:8080/
The websocket server should be available on http://localhost:8081/

##### From docker hub without docker-compose
Run the api: `docker pull greencomnetworks/franz-manager-api && docker run -e KAFKA_CONF='[YOUR_KAFKA_CONFIGURATION]' -p 8080:8080 greencomnetworks/franz-manager-api`
Run the frontend: `docker pull greencomnetworks/franz-manager && docker run -e SERVER_URL='http://0.0.0.0:8080/' -e WEBSOCKET_SERVER_URL='ws://0.0.0.0:8080/' -p 80:80 greencomnetworks/franz-manager`
The frontend should be available on http://localhost/
The api should be available on http://localhost:8080/
The websocket server should be available on ws://localhost:8080/