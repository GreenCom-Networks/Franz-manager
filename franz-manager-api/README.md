### Franz-manager-api

Discover more on the fancy [franz-manager.io](https://www.franz-manager.io/) !

This api should work with the front-end franz-manager --> [github](https://github.com/GreenCom-Networks/Franz-manager), [dockerhub](https://hub.docker.com/r/greencomnetworks/franz-manager)

### Environment variables


#### Mandatory environment variables

* `KAFKA_CONF` =
``` json
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

* `JVM_HEAP_SIZE` (ie -> 512)

* `LOG_LEVEL` (ie -> warn)

#### Development

First, install the dependencies by running `mvn clean package`.

Then, run the class `FranzManagerApi.java`.

Api should be available at localhost:1337

Apidoc can be found here --> [localhost:1337/franz-manager-api/apidoc/](http://localhost:1337/franz-manager-api/apidoc/)

#### Docker

###### From sources

Install dependencies like previous step.

Build your docker : `docker build -t franz-manager-api .`

Then run it : `docker run -e KAFKA_CONF='[]' -p 1337:1337 -p 5443:5443 franz-manager-api`

Api should be available at localhost:1337

Apidoc can be found here --> [localhost:1337/franz-manager-api/apidoc/](http://localhost:1337/franz-manager-api/apidoc/)

###### From docker hub

`docker run -e KAFKA_CONF='[]' -p 1337:1337 -p 5443:5443 greencomnetworks/franz-manager-api`

enjoy !

