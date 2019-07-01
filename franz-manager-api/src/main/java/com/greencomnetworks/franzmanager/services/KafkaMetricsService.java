package com.greencomnetworks.franzmanager.services;

import com.greencomnetworks.franzmanager.entities.Broker;
import com.greencomnetworks.franzmanager.entities.Cluster;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.management.remote.JMXConnector;
import javax.management.remote.JMXConnectorFactory;
import javax.management.remote.JMXServiceURL;
import java.io.IOException;
import java.net.MalformedURLException;
import java.util.HashMap;

public class KafkaMetricsService {
    private static final Logger logger = LoggerFactory.getLogger(KafkaMetricsService.class);
    private static HashMap<String, HashMap<String, JMXConnector>> jmxConnectors = new HashMap<>();

    public static void init() {
        logger.info("Starting jmx connectivity check loop");
        Thread thread = new Thread(new JmxConnectivityCheck(), "JmxConnectivityCheck");
        thread.setDaemon(true);
        thread.start();
    }

    public static HashMap<String, JMXConnector> getJmxConnectors(Cluster cluster) {
        return jmxConnectors.get(cluster.name);
    }

    private static class JmxConnectivityCheck implements Runnable {
        public void run() {
            while (true) {
                try {
                    for(Cluster cluster : ClustersService.clusters) {
                        jmxConnectors.computeIfAbsent(cluster.name, k -> new HashMap<>());
                        if(cluster.jmxPort <= 0) continue;
                        for(Broker broker : BrokersService.getKnownKafkaBrokers(cluster)) {
                            HashMap<String, JMXConnector> jmxConnectors = new HashMap<>(KafkaMetricsService.jmxConnectors.get(cluster.name));
                            JMXConnector jmxConnector = jmxConnectors.get(broker.id);
                            if(jmxConnector != null) {
                                // Query to keep the connection open?
                                try {
                                    jmxConnector.getMBeanServerConnection();
                                } catch(IOException e) {
                                    try {
                                        jmxConnector.close();
                                    } catch(IOException e1) {}
                                    jmxConnector = null;
                                }
                            }
                            if(jmxConnector == null) {
                                jmxConnector = connectJmx(cluster, broker);
                                jmxConnectors.put(cluster.name, jmxConnector);
                            }

                            KafkaMetricsService.jmxConnectors.put(cluster.name, jmxConnectors);
                        }
                    }
                    Thread.sleep(15000);
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
            }
        }

        private static JMXConnector connectJmx(Cluster cluster, Broker broker) {
            String url = broker.host + ':' + broker.jmxPort;
            try {
                JMXServiceURL jmxUrl = new JMXServiceURL("service:jmx:rmi:///jndi/rmi://" + url + "/jmxrmi");
                JMXConnector jmxc = JMXConnectorFactory.connect(jmxUrl, null);
                return jmxc;
            } catch (MalformedURLException e) {
                throw new RuntimeException("The following url has a bad format : " + url, e);
            } catch (IOException e) {
                logger.error("Cannot connect to the following url '{}': {}", url, e.getMessage());
            }
            return null;
        }
    }
}