package com.greencomnetworks.franzmanager;

import com.greencomnetworks.franzmanager.core.ApiDocHttpHandler;
import com.greencomnetworks.franzmanager.resources.LiveMessagesResource;
import com.greencomnetworks.franzmanager.services.*;
import org.glassfish.grizzly.http.server.HttpHandlerRegistration;
import org.glassfish.grizzly.http.server.HttpServer;
import org.glassfish.grizzly.http.server.NetworkListener;
import org.glassfish.grizzly.http.server.ServerConfiguration;
import org.glassfish.grizzly.threadpool.ThreadPoolConfig;
import org.glassfish.grizzly.websockets.WebSocketAddOn;
import org.glassfish.grizzly.websockets.WebSocketEngine;
import org.glassfish.jersey.grizzly2.httpserver.GrizzlyHttpServerFactory;
import org.glassfish.jersey.jackson.internal.jackson.jaxrs.json.JacksonJaxbJsonProvider;
import org.glassfish.jersey.logging.LoggingFeature;
import org.glassfish.jersey.server.ResourceConfig;
import org.glassfish.jersey.server.ServerProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.ws.rs.core.UriBuilder;
import javax.ws.rs.ext.MessageBodyReader;
import javax.ws.rs.ext.MessageBodyWriter;
import java.io.IOException;
import java.net.URI;

public class FranzManagerApi {
    static {
        System.setProperty("java.util.logging.manager", "org.apache.logging.log4j.jul.LogManager");
        System.setProperty("file.encoding", "UTF-8");
    }
    private static final Logger logger = LoggerFactory.getLogger(FranzManagerApi.class);

    private final FranzManagerApiConfig apiConfig;

    public FranzManagerApi() {
        this.apiConfig = FranzManagerApiConfig.fromProperties();
    }

    public FranzManagerApi(FranzManagerApiConfig apiConfig) {
        this.apiConfig = apiConfig;
    }

    public FranzManagerApi start() throws IOException {
        URI baseUri = UriBuilder.fromUri("http://0.0.0.0/").path(apiConfig.basePath).port(apiConfig.apiPort).build();
        ResourceConfig config = new ResourceConfig();

        config.property(ServerProperties.WADL_FEATURE_DISABLE, true);
        config.register(LoggingFeature.class);
        config.register(JacksonJaxbJsonProvider.class, MessageBodyReader.class, MessageBodyWriter.class);

        config.packages(this.getClass().getPackage().getName() + ".providers");
        config.packages(this.getClass().getPackage().getName() + ".resources");


        HttpServer server = GrizzlyHttpServerFactory.createHttpServer(baseUri, config, false);

        // Set Worker Pool Size
        {
            NetworkListener listener = server.getListener("grizzly");
            ThreadPoolConfig c = listener.getTransport().getWorkerThreadPoolConfig();
            c.setCorePoolSize(apiConfig.listenerWorkersSizeCore);
            c.setMaxPoolSize(apiConfig.listenerWorkersSizeMax);
        }

        // Websocket
        HttpServer wsServer;
        {
            WebSocketAddOn webSocketAddOn = new WebSocketAddOn();
            if(apiConfig.apiPort == apiConfig.wsPort) {
                wsServer = server;
                NetworkListener listener = server.getListener("grizzly");
                listener.registerAddOn(webSocketAddOn);

            } else {
                wsServer = new HttpServer();
                NetworkListener webSocketListener = new NetworkListener("websocket", "0.0.0.0", apiConfig.wsPort);
                webSocketListener.registerAddOn(webSocketAddOn);
                wsServer.addListener(webSocketListener);
                {
                    NetworkListener listener = server.getListener("grizzly");
                    ThreadPoolConfig c = listener.getTransport().getWorkerThreadPoolConfig();
                    c.setCorePoolSize(apiConfig.listenerWorkersSizeCore);
                    c.setMaxPoolSize(apiConfig.listenerWorkersSizeMax);
                }
            }
            WebSocketEngine.getEngine().register(apiConfig.basePath, "/", new LiveMessagesResource());
        }

        // Documentation
        {
            ServerConfiguration conf = server.getServerConfiguration();
            conf.addHttpHandler(new ApiDocHttpHandler("apidoc"),
                HttpHandlerRegistration.builder().contextPath(apiConfig.basePath + "/apidoc").urlPattern("/").build());
        }



        if(server == wsServer) {
            server.start();
            logger.info("Server started on port {} under {}.", apiConfig.apiPort, apiConfig.basePath);
        } else {
            server.start();
            wsServer.start();
            logger.info("HTTP Server started on port {} under {}", apiConfig.apiPort, apiConfig.basePath);
            logger.info("WS   Server started on port {} under {}", apiConfig.wsPort, apiConfig.basePath);
        }

        return this;
    }

    public static void main(String[] args) {
        try {
            FranzManagerApi api = new FranzManagerApi();

            ClustersService.init();
            AdminClientService.init();
            BrokersService.init();
            KafkaConsumerOffsetReader.init();
            KafkaMetricsService.init();
            TopicMetricsService.init();

            api.start();
        } catch (Throwable e) {
            logger.error("Couldn't start server", e);
            System.exit(1);
        }
    }
}
