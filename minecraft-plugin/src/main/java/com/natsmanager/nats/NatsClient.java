package com.natsmanager.nats;

import com.google.gson.Gson;
import io.nats.client.*;

import java.io.IOException;
import java.time.Duration;
import java.util.logging.Logger;

/**
 * NATS connection wrapper for the Minecraft plugin.
 * Handles connect, publish, subscribe, and reconnect.
 */
public class NatsClient {

    private static final Gson GSON = new Gson();
    private final String natsUrl;
    private final Logger logger;
    private Connection connection;

    public NatsClient(String natsUrl, Logger logger) {
        this.natsUrl = natsUrl;
        this.logger = logger;
    }

    /** Connect to the NATS broker */
    public void connect() throws IOException, InterruptedException {
        Options options = new Options.Builder()
            .server(natsUrl)
            .reconnectWait(Duration.ofSeconds(2))
            .maxReconnects(-1) // infinite
            .pingInterval(Duration.ofSeconds(15))
            .connectionName("minecraft-nats-manager")
            .connectionListener((conn, type) -> {
                switch (type) {
                    case CONNECTED    -> logger.info("[NatsManager] Connected to NATS: " + conn.getConnectedUrl());
                    case DISCONNECTED -> logger.warning("[NatsManager] Disconnected from NATS");
                    case RECONNECTED  -> logger.info("[NatsManager] Reconnected to NATS");
                    case CLOSED       -> logger.info("[NatsManager] NATS connection closed");
                    default           -> {}
                }
            })
            .errorListener(new ErrorListener() {
                @Override
                public void errorOccurred(Connection conn, String error) {
                    logger.severe("[NatsManager] NATS error: " + error);
                }
                @Override
                public void exceptionOccurred(Connection conn, Exception exp) {
                    logger.severe("[NatsManager] NATS exception: " + exp.getMessage());
                }
                @Override
                public void slowConsumerDetected(Connection conn, Consumer consumer) {
                    logger.warning("[NatsManager] NATS slow consumer detected");
                }
            })
            .build();

        connection = Nats.connect(options);
        logger.info("[NatsManager] NATS client ready");
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
            logger.severe("[NatsManager] Publish failed on " + subject + ": " + e.getMessage());
        }
    }

    /**
     * Subscribe to a subject and parse each message as a given class.
     * The handler is called in a dedicated dispatcher thread.
     */
    public <T> Subscription subscribe(String subject, Class<T> clazz, java.util.function.Consumer<T> handler) {
        if (connection == null) return null;

        Dispatcher dispatcher = connection.createDispatcher(msg -> {
            try {
                T parsed = GSON.fromJson(new String(msg.getData()), clazz);
                handler.accept(parsed);
            } catch (Exception e) {
                logger.severe("[NatsManager] Failed to parse message on " + subject + ": " + e.getMessage());
            }
        });

        return dispatcher.subscribe(subject);
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
