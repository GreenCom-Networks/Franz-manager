package com.greencomnetworks.franzmanager.core;

import javax.ws.rs.ClientErrorException;
import javax.ws.rs.core.Response;

/**
<<<<<<< HEAD
 * Created by Loïc Gaillard.
=======
 *
>>>>>>> github/master
 */
public class ConflictException extends ClientErrorException {

    public ConflictException() {
        super(Response.Status.CONFLICT);
    }

    public ConflictException(String message) {
        super(message, Response.Status.CONFLICT);
    }

    public ConflictException(Response response) {
        super(validate(response, Response.Status.CONFLICT));
    }

    public ConflictException(String message, Response response) {
        super(message, validate(response, Response.Status.CONFLICT));
    }

    public ConflictException(Throwable cause) {
        super(Response.Status.CONFLICT, cause);
    }

    public ConflictException(String message, Throwable cause) {
        super(message, Response.Status.CONFLICT, cause);
    }

    public ConflictException(Response response, Throwable cause) {
        super(validate(response, Response.Status.CONFLICT), cause);
    }

    public ConflictException(String message, Response response, Throwable cause) {
        super(message, validate(response, Response.Status.CONFLICT), cause);
    }


    private static Response validate(final Response response, Response.Status expectedStatus) {
        if (expectedStatus.getStatusCode() != response.getStatus()) {
            throw new IllegalArgumentException(String.format("Invalid response status code. Expected [%d], was [%d].",
                    expectedStatus.getStatusCode(), response.getStatus()));
        }
        return response;
    }
}
