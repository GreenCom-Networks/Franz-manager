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
 
 ---

### Screenshots
###### Dashboard view
![dashboard view](documentation/images/dashboard_view.jpg)
###### Cluster view (theme cashmachine)
![cluster view](documentation/images/cluster_view.jpg)
###### Cluster view (theme terminal)
![cluster view](documentation/images/cluster_view_terminal.jpg)
###### Cluster view (theme ratatouille)
![cluster view](documentation/images/cluster_view_ratatouille.jpg)
###### Topics view
![topics view](documentation/images/topics_view.jpg)
###### Topic view
![topic view](documentation/images/topic_view.jpg)
###### Consumer view
![consumer view](documentation/images/consumer_view.jpg)

---

### Deployment
#### Docker
Note that further documentation is available respectively in `franz-manager` and `franz-manager-api` subfolders.
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

---

### Links to more specific documentation
* Frontend: [franz-manager](franz-manager/README.md)
* Backend: [franz-manager-api](franz-manager-api/README.md)