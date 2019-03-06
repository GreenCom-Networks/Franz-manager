package com.greencomnetworks.franzmanager.providers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.greencomnetworks.franzmanager.utils.FUtils;

import javax.ws.rs.HeaderParam;
import javax.ws.rs.PathParam;
import javax.ws.rs.ProcessingException;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.ext.*;
import java.lang.annotation.Annotation;
import java.lang.reflect.Type;
import java.time.ZonedDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Custom Param Converter Provider
 */
@Provider
public class CustomParamConverterProvider implements ParamConverterProvider {

    @Context
    private Providers providers;

    @Override
    public <T> ParamConverter<T> getConverter(Class<T> rawType, Type genericType, Annotation[] annotations) {
        // ZonedDateTime
        if(genericType == ZonedDateTime.class) {
            ParamDetails paramDetails = ParamDetails.getParamDetailsFromAnnotations(annotations);
            return new ParamConverter<T>() {
                @SuppressWarnings("unchecked")
                @Override
                public T fromString(final String value) {
                    try {
                        if (value == null) return null;
                        // HACK: queryparam are decoded by default, which cause the + sign to be converted to a space.
                        // To get back a somewhat encoded value, we replace the space by a + sign.
                        // It should be okay in every case where there's no explicit timezone (which we are not parsing either way).
                        //                                   lgaillard - 30/07/2018
                        String encodedValue = value.replace(' ', '+');
                        return (T) FUtils.parseZonedDateTime(encodedValue);
                    } catch (Exception e) {
                        throw new ProcessingException("Couldn't parse " + paramDetails.type + " '" + paramDetails.name + "' (ZonedDateTime)", e);
                    }
                }

                @Override
                public String toString(final T value) {
                    if(value == null) return null;
                    return value.toString();
                }
            };
        }

        // Enums
        if(genericType instanceof Class && ((Class<?>)genericType).isEnum()) {
            ContextResolver<ObjectMapper> contextResolver = providers.getContextResolver(ObjectMapper.class, MediaType.APPLICATION_JSON_TYPE);
            ObjectMapper objectMapper = contextResolver.getContext(rawType);

            ParamDetails paramDetails = ParamDetails.getParamDetailsFromAnnotations(annotations);
            List<String> validValuesList = Arrays.stream(((Class) genericType).getEnumConstants()).map(Object::toString).collect(Collectors.toList());
            String validValues = String.join(",", validValuesList);

            return new ParamConverter<T>() {
                @Override
                public T fromString(String s) {
                    try {
                        return objectMapper.convertValue(s, rawType);
                    } catch(Exception e) {
                        throw new ProcessingException("Invalid value of " + paramDetails.type +" '" + paramDetails.name + "' (" + validValues + ")", e);
                    }
                }

                @Override
                public String toString(T value) {
                    if(value == null) return null;
                    return value.toString();
                }
            };
        }

        return null;
    }

    private static class ParamDetails {
        public final String type;
        public final String name;

        public ParamDetails(String type, String name) {
            this.type = type;
            this.name = name;
        }

        public static ParamDetails getParamDetailsFromAnnotations(Annotation[] annotations) {
            for (Annotation annotation : annotations) {
                if(annotation instanceof QueryParam) {
                    return new ParamDetails("QueryParam", ((QueryParam) annotation).value());
                }
                if(annotation instanceof HeaderParam) {
                    return new ParamDetails("HeaderParam", ((HeaderParam) annotation).value());
                }
                if(annotation instanceof PathParam) {
                    return new ParamDetails("PathParam", ((PathParam) annotation).value());
                }
            }
            return new ParamDetails(null, null);
        }
    }
}
