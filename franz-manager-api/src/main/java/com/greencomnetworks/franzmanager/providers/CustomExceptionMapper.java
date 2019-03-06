package com.greencomnetworks.franzmanager.providers;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.core.JsonParseException;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.greencomnetworks.franzmanager.utils.FUtils;
import org.apache.commons.lang3.StringUtils;
import org.glassfish.jersey.server.ParamException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.ws.rs.ClientErrorException;
import javax.ws.rs.ServerErrorException;
import javax.ws.rs.WebApplicationException;
import javax.ws.rs.container.PreMatching;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.ext.ExceptionMapper;
import javax.ws.rs.ext.Provider;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Generic exception Mapper with proper formatting
 */
@Provider
@PreMatching
public class CustomExceptionMapper implements ExceptionMapper<Exception> {
    private static final Logger logger = LoggerFactory.getLogger(CustomExceptionMapper.class);

    @Override
    public Response toResponse(Exception e) {
        // We are matching every exception. It might be better to use a matcher for each exception?

        if(e instanceof JsonParseException || e instanceof JsonMappingException) {
            return Response.status(Response.Status.BAD_REQUEST)
                    .type(MediaType.APPLICATION_JSON_TYPE)
                    .entity(new LogExceptionEntity(400, e.getMessage(), e.getStackTrace()))
                    .build();
        }

        if(e instanceof ClientErrorException) {
            ClientErrorException cee = (ClientErrorException) e;
            logger.info("Client error: {}", cee.getMessage());
            return Response.status(cee.getResponse().getStatus())
                    .type(MediaType.APPLICATION_JSON_TYPE)
                    .entity(new LogExceptionEntity(cee))
                    .build();
        }

        if(e instanceof ServerErrorException) {
            ServerErrorException see = (ServerErrorException) e;
            logger.error("Server error: {}", see.getMessage(), see);
            return Response.status(see.getResponse().getStatus())
                    .type(MediaType.APPLICATION_JSON_TYPE)
                    .entity(new LogExceptionEntity(see))
                    .build();
        }

        if(e instanceof ParamException) {
            Throwable cause = e.getCause();
            if(cause == null) cause = e;
            return Response.status(Response.Status.BAD_REQUEST)
                    .type(MediaType.APPLICATION_JSON_TYPE)
                    .entity(new LogExceptionEntity(Response.Status.BAD_REQUEST.getStatusCode(), cause.getMessage(), cause.getStackTrace()))
                    .build();
        }

        logger.error("Internal Server Error: {}", e.toString(), e);
        Throwable cause = FUtils.getOrElse(e.getCause(), e);
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new LogExceptionEntity(cause)).build();
    }


    private static class LogExceptionEntity {
        public final int code;
        public final String message;
        @JsonInclude(JsonInclude.Include.NON_NULL)
        public final List<String> stack;

        LogExceptionEntity(Throwable e) {
            this(500, e.toString(), e.getStackTrace());
        }

        LogExceptionEntity(WebApplicationException e) {
            this(
                e.getResponse().getStatus(),
                StringUtils.equals(e.getMessage(), buildDefaultResponseMessage(e.getResponse().getStatusInfo())) ?
                    e.getResponse().getStatusInfo().getReasonPhrase() : e.getMessage(),
                e.getStackTrace()
            );
        }

        LogExceptionEntity(int code, String message, StackTraceElement[] stack) {
            this.code = code;
            this.message = message;

            // Print stack on code = 5xx
            if (code >= 500 && code < 600) {
                this.stack = Arrays.stream(stack).map(StackTraceElement::toString).collect(Collectors.toList());
            } else {
                this.stack = null;
            }
        }

        private static String buildDefaultResponseMessage(Response.StatusType statusType) {
            return "HTTP " + statusType.getStatusCode() + " " + statusType.getReasonPhrase();
        }
    }
}
