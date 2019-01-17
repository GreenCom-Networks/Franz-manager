### Franz-manager

This application cannot work without the franz-manager-api --> [github](https://github.com/GreenCom-Networks/Franz-manager-api), [dockerhub](https://hub.docker.com/r/greencomnetworks/franz-manager-api)

This application is a smooth alternative to kafka-manager. **It needs JMX to be enabled on your kafka server.**

Features : 
 - Multiple clusters management.
 - Inspect cluster state (topics, consumers, offsets, brokers, replicas, settings).
 - Topics listing.
 - Topics creation / deletion.
 - Detailed topic information with edition (metrics, settings, partitions, consumers, last messages).
 - Consumers listing.
 - Live consumption (disabled, should come back soon).
 - Bulk topic deletion.
 - Detailed consumer information (partitions, topic offset, consumer offset, lag, commit timestamp).
 - Multiple themes.
 
#### Screenshots

###### Dashboard view
![dashboard view](https://github.com/GreenCom-Networks/Franz-manager/blob/master/demo_assets/dashboard_view.jpg?raw=true)
###### Cluster view (theme cashmachine)
![cluster view](https://github.com/GreenCom-Networks/Franz-manager/blob/master/demo_assets/cluster_view.jpg?raw=true)
###### Cluster view (theme terminal)
![cluster view](https://github.com/GreenCom-Networks/Franz-manager/blob/master/demo_assets/cluster_view_terminal.jpg?raw=true)
###### Cluster view (theme ratatouille)
![cluster view](https://github.com/GreenCom-Networks/Franz-manager/blob/master/demo_assets/cluster_view_ratatouille.jpg?raw=true)
###### Topics view
![topics view](https://github.com/GreenCom-Networks/Franz-manager/blob/master/demo_assets/topics_view.jpg?raw=true)
###### Topic view
![topic view](https://github.com/GreenCom-Networks/Franz-manager/blob/master/demo_assets/topic_view.jpg?raw=true)
###### Consumer view
![consumer view](https://github.com/GreenCom-Networks/Franz-manager/blob/master/demo_assets/consumer_view.jpg?raw=true)

#### Development

First, install the dependencies by running `npm install` or `yarn install`.

Then, run `npm start`, the command will execute a local server on port 8080.

Finally just go on localhost:8080 and enjoy.

#### Production

Install the dependencies (`npm install` or `yarn install`) then run `npm run build`.
It will produce a dist folder at the root of the project.

#### Docker

Build your docker : `docker build -t franz-manager .`

Then run it : `docker run -e SERVER_URL=https://API_URL.net/franz-manager-api -p 8080:80 franz-manager`
(don't forget /franz-manager-api at the end of the url)

App should be available at localhost:8080
