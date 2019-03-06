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
            AdminClient adminClient = KafkaAdminClient.create(FUtils.Map.<String, Object>builder()
                .put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, cluster.brokersConnectString)
                .build());
            adminClients.put(cluster.name, adminClient);
        }
    }

    public static AdminClient getAdminClient(Cluster cluster) {
        return adminClients.get(cluster.name);
    }
}