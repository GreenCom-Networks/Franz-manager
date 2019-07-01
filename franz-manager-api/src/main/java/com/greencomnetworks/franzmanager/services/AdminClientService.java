package com.greencomnetworks.franzmanager.services;

import com.greencomnetworks.franzmanager.entities.Cluster;
import com.greencomnetworks.franzmanager.utils.FUtils;
import org.apache.kafka.clients.admin.AdminClient;
import org.apache.kafka.clients.admin.AdminClientConfig;
import org.apache.kafka.clients.admin.KafkaAdminClient;

import java.util.HashMap;
import java.util.Map;

public class AdminClientService {
    private static Map<String, AdminClient> adminClients;

    private AdminClientService() {}

    public static void init() {
        adminClients = new HashMap<>();
        for(Cluster cluster : ClustersService.clusters) {
            // TODO: set clientId

            Map<String, Object> config = new HashMap<>();
            config.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, cluster.brokersConnectString);

            if(cluster.sslConfiguration != null) {
                config.put(AdminClientConfig.SECURITY_PROTOCOL_CONFIG, "SSL");
                config.put("ssl.endpoint.identification.algorithm", "");
                config.put("ssl.truststore.location", cluster.sslConfiguration.truststoreFile);
                config.put("ssl.truststore.password", cluster.sslConfiguration.truststorePassword);
                config.put("ssl.keystore.type", "PKCS12");
                config.put("ssl.keystore.location", cluster.sslConfiguration.keystoreFile);
                config.put("ssl.keystore.password", cluster.sslConfiguration.keystorePassword);
            }

            AdminClient adminClient = KafkaAdminClient.create(config);
            adminClients.put(cluster.name, adminClient);
        }
    }

    public static AdminClient getAdminClient(Cluster cluster) {
        return adminClients.get(cluster.name);
    }
}