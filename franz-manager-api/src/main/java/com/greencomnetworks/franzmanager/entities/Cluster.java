package com.greencomnetworks.franzmanager.entities;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;

public class Cluster {
    public String name;
    public String brokersConnectString;
    public int jmxPort;

    @JsonIgnore
    public SSLConfiguration sslConfiguration;


    public Cluster() {}
    @JsonCreator
    public Cluster(@JsonProperty("name") String name,
                   @JsonProperty("brokersConnectString") String brokersConnectString,
                   @JsonProperty("jmxPort") Integer jmxPort,
                   @JsonProperty("sslConfiguration") SSLConfiguration sslConfiguration) {
        this.name = name;
        this.brokersConnectString = brokersConnectString;
        this.jmxPort = jmxPort != null ? jmxPort : -1;
        this.sslConfiguration = sslConfiguration;
    }

    public static class SSLConfiguration {
        public String keystoreFile;
        public String truststoreFile;
        public String keystorePassword;
        public String truststorePassword;

        public SSLConfiguration() {}
    }
}
