package com.greencomnetworks.franzmanager.services;

import com.greencomnetworks.franzmanager.entities.Broker;
import com.greencomnetworks.franzmanager.entities.Cluster;
import org.apache.kafka.clients.admin.AdminClient;
import org.apache.kafka.clients.admin.Config;
import org.apache.kafka.clients.admin.ConfigEntry;
import org.apache.kafka.common.Node;
import org.apache.kafka.common.config.ConfigResource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Duration;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;

public class BrokersService {
    private static final Logger logger = LoggerFactory.getLogger(BrokersService.class);
    private static Map<String, List<Broker>> brokersByCluster = new HashMap<>();

    private static final Duration discoveryPeriod = Duration.ofMinutes(5);

    public static void init() {
        for(Cluster cluster : ClustersService.clusters) {
            List<Broker> brokers = scanBrokers(cluster);
            brokersByCluster.put(cluster.name, brokers);

            KafkaBrokersDiscovery discovery = new KafkaBrokersDiscovery(cluster);
            discovery.start();
        }
    }

    public static List<Broker> getKnownKafkaBrokers(Cluster cluster) {
        return brokersByCluster.getOrDefault(cluster.name, new ArrayList<>(0));
    }


    private static List<Broker> scanBrokers(Cluster cluster) {
        AdminClient adminClient = AdminClientService.getAdminClient(cluster);


        List<Broker> brokers = new ArrayList<>();
        try {
            Collection<Node> nodes = adminClient.describeCluster().nodes().get();
            Node controller = adminClient.describeCluster().controller().get();

            Map<String, Config> configs = adminClient.describeConfigs(nodes.stream().map(n -> new ConfigResource(ConfigResource.Type.BROKER, n.idString())).collect(Collectors.toList()))
                .all().get().entrySet().stream()
                .collect(Collectors.toMap(
                    e -> e.getKey().name(),
                    e -> e.getValue()
                ));


            for(Node node : nodes) {
                Broker broker = new Broker();
                broker.id = node.idString();
                broker.host = node.host();
                broker.port = node.port();
                broker.jmxPort = cluster.jmxPort;
                broker.rack = node.rack();
                broker.leader = controller.id() == node.id();
                broker.configurations = configs.get(node.idString()).entries().stream()
                    .map(configEntry -> {
                        if(configEntry.value() == null) {
                            return new ConfigEntry(configEntry.name(), "null");
                        }
                        return configEntry;
                    })
                    .collect(Collectors.toMap(
                        e -> e.name(),
                        e -> e.value()
                    ));
                broker.state = Broker.State.OK;

                brokers.add(broker);
            }
        } catch(Exception e) {
            throw new RuntimeException(String.format("Unable to scan brokers for cluster %s: %s", cluster.name, e.getMessage()), e);
        }

        return brokers;
    }

    private static class KafkaBrokersDiscovery implements Runnable {

        private final Cluster cluster;
        private final AtomicBoolean running = new AtomicBoolean();

        public KafkaBrokersDiscovery(Cluster cluster) {
            this.cluster = cluster;
        }


        public void start() {
            if(running.get()) {
                logger.warn("Kafka Brokers Discovery already running.");
                return;
            }

            running.set(true);
            logger.info("Starting brokers discovery for cluster \"{}\"",  cluster.name);
            Thread thread = new Thread(this, "KafkaBrokersDiscovery-" + cluster.name);
            thread.setDaemon(true);
            thread.start();
        }

        public void run() {
            try {
                while(running.get()) {
                    try {
                        while(running.get()) {
                            List<Broker> brokers = scanBrokers(cluster);
                            brokersByCluster.put(cluster.name, brokers);

                            Thread.sleep(discoveryPeriod.toMillis());
                        }
                    } catch(InterruptedException e) {
                        /* noop */
                    }
                }
            } catch(Throwable e) {
                logger.error("Critical error in Kafka Brokers Discovery: {}", e, e);
            }
        }
    }
}
