package com.greencomnetworks.franzmanager.services;

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

    public static HashMap<String, HashMap<String, JMXConnector>> getJmxConnectors() {
        return jmxConnectors;
    }

    private static class JmxConnectivityCheck implements Runnable {
        public void run() {
            while (true) {
                try {
                    ClustersService.clusters.forEach(cluster -> {
                        jmxConnectors.computeIfAbsent(cluster.name, k -> new HashMap<>());
                        for (String url : cluster.jmxConnectString.split(",")) {
                            HashMap<String, JMXConnector> mbscs = jmxConnectors.get(cluster.name);
                            try {
                                mbscs.get(url).getMBeanServerConnection();
                            } catch (IOException | NullPointerException e) {
                                connectJmx(cluster, url);
                            }
                        }
                    });
                    Thread.sleep(5000);
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
            }
        }

        private static void connectJmx(Cluster cluster, String url) {
            try {
                logger.info("Connecting to jmx -- url: " + url.split(":")[0] + " -- cluster: " + cluster.name);
                JMXServiceURL jmxUrl = new JMXServiceURL("service:jmx:rmi:///jndi/rmi://" + url + "/jmxrmi");
                JMXConnector jmxc = JMXConnectorFactory.connect(jmxUrl, null);
                jmxConnectors.get(cluster.name).put(url, jmxc);
                logger.info("__ connected " + url + " -- " + cluster.name);
            } catch (MalformedURLException e) {
                throw new RuntimeException("The following url has a bad format : " + url, e);
            } catch (IOException e) {
                logger.error("Cannot connect to the following url '{}': {}", url, e.getMessage());
                try {
                    Thread.sleep(1000);
                } catch (InterruptedException e1) {
                    // don't care.
                }
            }
        }
    }
}