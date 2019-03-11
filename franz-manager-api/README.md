# Franz-manager-api
A multi-cluster Kafka Administration Tool (back-end).
This application is a smooth alternative to kafka-manager.  
Discover more at [franz-manager.io](https://www.franz-manager.io/) !

### Environment variables
#### Mandatory environment variables
* `KAFKA_CONF` =
```json
[
     {
         "name": "cluster 1",
         "brokersConnectString": "127.0.0.2:9092,127.0.0.3:9092,127.0.0.4:9092",
         "jmxConnectString": "127.0.0.2:9997,127.0.0.3:9997,127.0.0.4:9997",
         "zookeeperConnectString": "127.0.0.2:2181,127.0.0.3:2181,127.0.0.4:2181"
     },
     {
         "name": "cluster 2",
         "brokersConnectString": "127.0.0.5:9092,127.0.0.6:9092,127.0.0.7:9092",
         "jmxConnectString": "127.0.0.5:9997,127.0.0.6:9997,127.0.0.7:9997",
         "zookeeperConnectString": "127.0.0.2:2181,127.0.0.3:2181,127.0.0.4:2181"
     }
]
```

#### Optional
You might also be interested in defining the following configuration :
* `API_PORT`: (default: 8080)
* `WS_PORT`: (default: 8080)
* `API_BASEPATH`: (default: /)
* `API_LISTENER_WORKERS_CORE`: (default: 4)
* `API_LISTENER_WORKERS_MAX`: (default: 100)
* `LOG_LEVEL`: (default: info)
* `JVM_HEAP_SIZE`: Maximum heap size available for the JVM (default: 1024)

### Deployment
#### Development
Requires JDK 11.  
Build: `mvn clean package`.  
Run: `KAFKA_CONF='[]' java -jar target/franz-manager-api-jar-with-dependencies.jar`.
The api should be available on http://localhost:8080/
The api documentation should be available on http://localhost:8080/apidoc/

#### Docker
##### From sources
Build: `docker build . -t franz-manager-api`
Run: `docker run -e KAFKA_CONF='[]' -p 8080:8080 franz-manager-api`
The api should be available on http://localhost:8080/
The api documentation should be available on http://localhost:8080/apidoc/

##### From docker hub
Run: `docker pull greencomnetworks/franz-manager-api && docker run -e KAFKA_CONF='[]' -p 8080:8080 greencomnetworks/franz-manager-api`
The api should be available on http://localhost:8080/
The api documentation should be available on http://localhost:8080/apidoc/
