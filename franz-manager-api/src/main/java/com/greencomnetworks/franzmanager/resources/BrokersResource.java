package com.greencomnetworks.franzmanager.resources;

import com.greencomnetworks.franzmanager.entities.Broker;
import com.greencomnetworks.franzmanager.entities.Cluster;
import com.greencomnetworks.franzmanager.services.AdminClientService;
import com.greencomnetworks.franzmanager.services.BrokersService;
import com.greencomnetworks.franzmanager.services.ClustersService;
import com.greencomnetworks.franzmanager.services.KafkaMetricsService;
import com.greencomnetworks.franzmanager.utils.FUtils;
import com.greencomnetworks.franzmanager.utils.KafkaUtils;
import org.apache.kafka.clients.admin.AdminClient;
import org.apache.kafka.clients.admin.Config;
import org.apache.kafka.clients.admin.ConfigEntry;
import org.apache.kafka.clients.admin.DescribeConfigsOptions;
import org.apache.kafka.common.Node;
import org.apache.kafka.common.config.ConfigResource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.management.MBeanServerConnection;
import javax.management.ObjectName;
import javax.management.remote.JMXConnector;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;

@Path("/brokers")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
public class BrokersResource {
    private static final Logger logger = LoggerFactory.getLogger(BrokersResource.class);

    private Cluster cluster;

    public BrokersResource(@HeaderParam("clusterId") String clusterId) {
        this.cluster = ClustersService.getCluster(clusterId);
    }

    @GET
    public List<Broker> getBrokers(@QueryParam("withConfiguration") boolean withConfiguration) {
        if(cluster == null) throw new NotFoundException("Cluster not found");

        AdminClient adminClient = AdminClientService.getAdminClient(cluster);
        List<Broker> knownBrokers = BrokersService.getKnownKafkaBrokers(cluster);

        if (withConfiguration) {
            for(Broker broker : knownBrokers) {
                Map<String, String> configs;
                if (broker.state.equals(Broker.State.OK)) {
                    ConfigResource configResource = new ConfigResource(ConfigResource.Type.BROKER, broker.id);
                    List<ConfigResource> configResources = FUtils.List.of(configResource);
                    try {
                        Map<ConfigResource, Config> describeConfigsResult = adminClient.describeConfigs(configResources, new DescribeConfigsOptions().timeoutMs(3000)).all().get();
                        Config config = describeConfigsResult.get(configResource);
                        configs = new HashMap<>();
                        for (ConfigEntry entry : config.entries()) {
                            configs.put(entry.name(), entry.value());
                        }
                    } catch (Exception e) {
                        broker.state = Broker.State.BROKEN;
                        configs = null;
                    }
                } else {
                    configs = null;
                }
                if (configs == null) {
                    configs = new HashMap<>();
                    configs.put("zookeeper.connect", cluster.zookeeperConnectString);
                }
                broker.configurations = configs;
            }
        }

        return knownBrokers;
    }

    @GET
    @Path("/{brokerId}")
    public Broker getBroker(@PathParam("brokerId") String brokerId) {
        if(cluster == null) throw new NotFoundException("Cluster not found");

        AdminClient adminClient = AdminClientService.getAdminClient(cluster);
        HashMap<String, JMXConnector> jmxConnector = KafkaMetricsService.getJmxConnectors(cluster);
        try {
            Config config = KafkaUtils.describeBrokerConfig(adminClient, brokerId);
            if (config == null) {
                throw new NotFoundException("This broker (" + brokerId + ") doesn't exist.");
            }

            Collection<Node> brokers = adminClient.describeCluster().nodes().get();
            Node node = brokers.stream().filter(n -> n.idString().equals(brokerId)).findAny().orElse(null);
            if (node == null) {
                throw new NotFoundException("This broker (" + brokerId + ") doesn't exist.");
            }


            Map<String, String> configs = new HashMap<>();
            for (ConfigEntry entry : config.entries()) {
                configs.put(entry.name(), entry.value());
            }

            try {
                MBeanServerConnection mbsc = jmxConnector.get(node.host()).getMBeanServerConnection();
                Float bytesIn = Float.valueOf(mbsc.getAttribute(new ObjectName("kafka.server:type=BrokerTopicMetrics,name=BytesInPerSec"), "OneMinuteRate").toString());
                Float bytesOut = Float.valueOf(mbsc.getAttribute(new ObjectName("kafka.server:type=BrokerTopicMetrics,name=BytesOutPerSec"), "OneMinuteRate").toString());

                return new Broker(node.idString(), node.host(), node.port(), -1, configs, Broker.State.OK);
            } catch (Exception e) {
                logger.info("ERROR: " + e.getMessage());
                return null;
            }
        } catch (InterruptedException e) {
            throw new RuntimeException(e);
        } catch (ExecutionException e) {
            throw new RuntimeException(e.getCause());
        }
    }
}
