package com.greencomnetworks.franzmanager;

import com.greencomnetworks.franzmanager.utils.configs.ConfigUtils;
import com.greencomnetworks.franzmanager.utils.configs.SafePropertiesConfiguration;

public class FranzManagerApiConfig {
    public final String projectId;
    public final String basePath;
    public final int apiPort;
    public final int wsPort;
    public final int listenerWorkersSizeCore;
    public final int listenerWorkersSizeMax;

    public FranzManagerApiConfig(String projectId, String basePath, int apiPort, int wsPort, int listenerWorkersSizeCore, int listenerWorkersSizeMax) {
        this.projectId = projectId;
        this.basePath = basePath;
        this.apiPort = apiPort;
        this.wsPort = wsPort;
        this.listenerWorkersSizeCore = listenerWorkersSizeCore;
        this.listenerWorkersSizeMax = listenerWorkersSizeMax;
    }

    public static FranzManagerApiConfig fromProperties() {
        SafePropertiesConfiguration properties = ConfigUtils.properties("config.properties");

        return new FranzManagerApiConfig(
            properties.getString("project_id"),
            properties.getString("base_path"),
            properties.getInteger("api_port"),
            properties.getInteger("ws_port"),
            properties.getInteger("listener.workers.size.core"),
            properties.getInteger("listener.workers.size.max")
        );
    }
}
