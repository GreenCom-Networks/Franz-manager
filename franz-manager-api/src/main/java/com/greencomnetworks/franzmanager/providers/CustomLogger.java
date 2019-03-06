package com.greencomnetworks.franzmanager.providers;

import org.apache.commons.text.StringEscapeUtils;
import org.apache.logging.log4j.ThreadContext;
import org.glassfish.jersey.server.ContainerRequest;
import org.glassfish.jersey.server.ContainerResponse;
import org.glassfish.jersey.server.monitoring.ApplicationEvent;
import org.glassfish.jersey.server.monitoring.ApplicationEventListener;
import org.glassfish.jersey.server.monitoring.RequestEvent;
import org.glassfish.jersey.server.monitoring.RequestEventListener;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.annotation.Priority;
import javax.ws.rs.container.PreMatching;
import javax.ws.rs.ext.Provider;
import java.io.BufferedInputStream;
import java.io.InputStream;
import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicLong;

/**
 *
 */
@Provider
@PreMatching
@Priority(Integer.MIN_VALUE)
public class CustomLogger implements ApplicationEventListener {
    private static final Logger logger = LoggerFactory.getLogger(CustomLogger.class);

    @Override
    public void onEvent(ApplicationEvent event) {

    }

    @Override
    public RequestEventListener onRequest(RequestEvent requestEvent) {
        return new CustomRequestEventListener();
    }


    public static class CustomRequestEventListener implements RequestEventListener {

        private static final int ENTITY_MAX_BYTES_SIZE = 1024 * 8; // 8KB

        private static final AtomicLong callCount = new AtomicLong(0);


        private final long callId;
        private final Instant startTime;

        private String body;

        public CustomRequestEventListener() {
            callId = callCount.incrementAndGet();
            startTime = Instant.now();

            ThreadContext.put("call.id", Long.toString(callId));
        }

        @Override
        public void onEvent(RequestEvent event) {
            if(event.getType() == RequestEvent.Type.MATCHING_START) {
                ContainerRequest containerRequest = event.getContainerRequest();

                body = getEntityBody(containerRequest, ENTITY_MAX_BYTES_SIZE);
            } else if(event.getType() == RequestEvent.Type.FINISHED) {
                ContainerRequest containerRequest = event.getContainerRequest();
                ContainerResponse containerResponse = event.getContainerResponse();

                String method = containerRequest.getMethod();
                URI requestURI = containerRequest.getAbsolutePath();
                int status = containerResponse.getStatus();
                Duration requestDuration = Duration.between(startTime, Instant.now());

                String path = "/" + event.getUriInfo().getPath();
                String query = requestURI.getQuery();

                String requestedFile = path;
                if(query != null) requestedFile = path + "?" + query;

                if(body == null) {
                    logger.info("{}| {} {} - {}  [{} ms]",
                        callId, method, requestedFile, status, requestDuration.toMillis()
                    );
                } else {
                    logger.info("{}| {} {} - {}  [{} ms]\n{}| \"{}\"",
                        callId, method, requestedFile, status, requestDuration.toMillis(),
                        callId, StringEscapeUtils.escapeJava(body)
                    );
                }

                ThreadContext.clearAll();
            }
        }

        private static String getEntityBody(ContainerRequest containerRequest, int maxEntitySize) {
            String body = null;

            InputStream stream = containerRequest.getEntityStream();

            // Ensure the stream support mark/reset
            if(!stream.markSupported()) {
                stream = new BufferedInputStream(stream);
                containerRequest.setEntityStream(stream);
            }

            stream.mark(maxEntitySize + 1);

            // Read entity
            try {
                byte[] entity = new byte[maxEntitySize + 1];
                int entitySize = stream.read(entity);
                if(entitySize >= 0) {
                    body = new String(entity, 0, Math.min(entitySize, maxEntitySize), "UTF-8");
                    if(entitySize > maxEntitySize) {
                        body += "...more...";
                    }
                }
            } catch (Exception e) {
                logger.warn("Couldn't read input entity", e);
            }

            // Reset entity stream
            try {
                stream.reset();
            } catch(Exception e) {
                // Shouldn't happen because if checked it earlier
                logger.error("Couldn't reset input entity stream", e);
            }

            return body;
        }
    }
}