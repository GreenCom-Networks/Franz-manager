package com.greencomnetworks.franzmanager.services;

import com.greencomnetworks.franzmanager.entities.Broker;
import com.greencomnetworks.franzmanager.entities.Cluster;
import com.greencomnetworks.franzmanager.entities.Metric;
import com.greencomnetworks.franzmanager.resources.BrokersResource;
import com.greencomnetworks.franzmanager.utils.FUtils;
import org.apache.commons.lang3.math.NumberUtils;
import org.apache.kafka.clients.admin.AdminClient;
import org.apache.kafka.clients.admin.ListTopicsOptions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.management.*;
import javax.management.remote.JMXConnector;
import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ExecutionException;

public class TopicMetricsService {
    private static final Logger logger = LoggerFactory.getLogger(BrokersResource.class);
    private static Map<String, Map<String, Map<String, Metric>>> topicMetrics = new HashMap<>();

    public static void init() {
        topicMetrics = new HashMap<>();
        new Thread(new CheckMetrics(), "CheckMetrics").start();
    }

    public static Map<String, Map<String, Metric>> getTopicsMetrics(Cluster cluster) {
        return topicMetrics.get(cluster.name);
    }

    private static class CheckMetrics implements Runnable {
        public void run() {
            while (true) {
                try {
                    Thread.sleep(15000); // wait 15 sc before first try.

                    for(Cluster cluster : ClustersService.clusters) {
                        Map<String, JMXConnector> jmxConnectors = KafkaMetricsService.getJmxConnectors(cluster);
                        AdminClient adminClient = AdminClientService.getAdminClient(cluster);
                        ListTopicsOptions listTopicsOptions = new ListTopicsOptions().listInternal(true);
                        Set<String> topics = adminClient.listTopics(listTopicsOptions).names().get();


                        List<Broker> knownBrokers = BrokersService.getKnownKafkaBrokers(cluster);
                        Map<String, Map<String, Metric>> clusterTopicsMetrics = new HashMap<>();

                        topics.forEach(topic -> {
                            Map<String, Metric> brokerTopicMetrics = new HashMap<>();

                            for (String brokerHost : jmxConnectors.keySet()) { // for each brokers.
                                try {
                                    MBeanServerConnection mbsc = jmxConnectors.get(brokerHost).getMBeanServerConnection();
                                    Broker currentBroker = FUtils.findInCollection(knownBrokers, n -> (n.host + ':' + n.jmxPort).equals(brokerHost));

                                    String queryString = "kafka.server:type=BrokerTopicMetrics,name=MessagesInPerSec,topic=" + topic;
                                    String metricName = "MessagesInPerSec";
                                    Metric metric = new Metric("BrokerTopicMetrics", metricName, Integer.parseInt(currentBroker.id), new HashMap<>());
                                    ObjectName objName = new ObjectName(queryString);
                                    MBeanInfo beanInfo = mbsc.getMBeanInfo(objName);
                                    for (MBeanAttributeInfo attr : beanInfo.getAttributes()) {
                                        Object value = mbsc.getAttribute(objName, attr.getName());
                                        if (NumberUtils.isCreatable(String.valueOf(value))) {
                                            Float floatValue = Float.parseFloat(String.valueOf(value));
                                            Float existingValue = Float.parseFloat(String.valueOf(FUtils.getOrElse(metric.metrics.get(attr.getName()), 0)));
                                            metric.metrics.put(attr.getName(), floatValue + existingValue);
                                        } else {
                                            metric.metrics.put(attr.getName(), value);
                                        }
                                    }
                                    brokerTopicMetrics.put(currentBroker.id, metric);
                                } catch (InstanceNotFoundException | MalformedObjectNameException | AttributeNotFoundException e) {
                                    // we don't care
                                } catch (IOException | ReflectionException | IntrospectionException | MBeanException e) {
                                    e.printStackTrace();
                                }
                            }
                            clusterTopicsMetrics.put(topic, brokerTopicMetrics);
                        });

                        topicMetrics.put(cluster.name, clusterTopicsMetrics);
                    }
                    Thread.sleep(30000); // every 5 minutes
                } catch (InterruptedException | ExecutionException e) {
                    e.printStackTrace();
                }
            }
        }
    }
}
