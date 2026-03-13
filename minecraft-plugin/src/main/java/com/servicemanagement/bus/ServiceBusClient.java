package com.servicemanagement.bus;

import com.google.gson.Gson;
import io.nats.client.Connection;
import io.nats.client.Consumer;
import io.nats.client.Dispatcher;
import io.nats.client.ErrorListener;
import io.nats.client.Nats;
import io.nats.client.Options;

import java.io.IOException;
import java.time.Duration;
import java.util.logging.Logger;

/**
 * Broker connection wrapper for the Minecraft plugin.
 * Handles connect, publish, subscribe, and reconnect.
 */
public class ServiceBusClient {

    private static final Gson GSON = new Gson();
    private final String brokerUrl;
    private final Logger logger;
    private Connection connection;

    public ServiceBusClient(String brokerUrl, Logger logger) {
        this.brokerUrl = brokerUrl;
        this.logger = logger;
    }

    /** Connect to the broker */
    public void connect() throws IOException, InterruptedException {
        Options options = new Options.Builder()
            .server(brokerUrl)
            .reconnectWait(Duration.ofSeconds(2))
            .maxReconnects(-1) // infinite
            .pingInterval(Duration.ofSeconds(15))
            .connectionName("minecraft-service-management")
            .connectionListener((conn, type) -> {
                switch (type) {
                    case CONNECTED, DISCONNECTED, RECONNECTED, CLOSED -> {}
                    default -> {}
                }
            })
            .errorListener(new ErrorListener() {
                @Override
                public void errorOccurred(Connection conn, String error) {
                    // Silent by design
                }
                @Override
                public void exceptionOccurred(Connection conn, Exception exp) {
                    // Silent by design
                }
                @Override
                public void slowConsumerDetected(Connection conn, Consumer consumer) {
                    // Silent by design
                }
            })
            .build();

        connection = Nats.connect(options);
    }

    /** Publish a Java object as JSON to a subject */
    public void publish(String subject, Object payload) {
        if (connection == null || connection.getStatus() != Connection.Status.CONNECTED) {
            return;
        }
        try {
            byte[] data = GSON.toJson(payload).getBytes();
            connection.publish(subject, data);
        } catch (Exception e) {
            // Silent by design
        }
    }

    /**
     * Subscribe to a subject and parse each message as a given class.
     * The handler is called in a dedicated dispatcher thread.
     */
    public <T> BusSubscription subscribe(String subject, Class<T> clazz, java.util.function.Consumer<T> handler) {
        if (connection == null) return null;

        Dispatcher dispatcher = connection.createDispatcher(msg -> {
            try {
                T parsed = GSON.fromJson(new String(msg.getData()), clazz);
                handler.accept(parsed);
            } catch (Exception e) {
                // Silent by design
            }
        });

        dispatcher.subscribe(subject);
        return new BusSubscription(dispatcher, subject);
    }

    public static class Envelope {
        public String serverId;
        public String type;
        public long timestamp;
        public Object payload;
    }

    public <T> BusSubscription subscribeEnvelope(
        String subject,
        Class<T> payloadClass,
        java.util.function.BiConsumer<Envelope, T> handler
    ) {
        if (connection == null) return null;

        Dispatcher dispatcher = connection.createDispatcher(msg -> {
            try {
                Envelope env = GSON.fromJson(new String(msg.getData()), Envelope.class);
                if (env == null || env.payload == null) return;
                T payload = GSON.fromJson(GSON.toJson(env.payload), payloadClass);
                handler.accept(env, payload);
            } catch (Exception e) {
                // Silent by design
            }
        });

        dispatcher.subscribe(subject);
        return new BusSubscription(dispatcher, subject);
    }

    /** Gracefully close the connection */
    public void close() {
        if (connection != null) {
            try {
                connection.close();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
    }

    public boolean isConnected() {
        return connection != null && connection.getStatus() == Connection.Status.CONNECTED;
    }
}
