package com.servicemanagement.modules;

import com.servicemanagement.bus.ServiceBusClient;
import com.servicemanagement.bus.ServiceSubjects;
import com.servicemanagement.config.PluginConfig;

import java.util.HashMap;
import java.util.Map;
import java.util.logging.Handler;
import java.util.logging.Level;
import java.util.logging.LogRecord;
import java.util.logging.Logger;

public class ConsoleStreamer {

    private final ServiceBusClient bus;
    private final PluginConfig config;
    private Handler handler;

    public ConsoleStreamer(ServiceBusClient bus, PluginConfig config) {
        this.bus = bus;
        this.config = config;
    }

    public void start() {
        if (!config.enableConsoleStream) return;

        Logger root = Logger.getLogger("");
        handler = new Handler() {
            @Override
            public void publish(LogRecord record) {
                if (!bus.isConnected()) return;
                if (record == null) return;
                if (!isLoggable(record)) return;

                String msg = record.getMessage();
                if (msg == null || msg.isBlank()) return;

                Map<String, Object> payload = new HashMap<>();
                payload.put("level", toLevel(record.getLevel()).toUpperCase());
                payload.put("message", msg);
                payload.put("logger", record.getLoggerName());

                Map<String, Object> env = new HashMap<>();
                env.put("serverId", config.serverId);
                env.put("type", "log");
                env.put("timestamp", record.getMillis());
                env.put("payload", payload);

                bus.publish(ServiceSubjects.logs(config.serverId), env);
            }

            @Override public void flush() {}
            @Override public void close() throws SecurityException {}
        };

        root.addHandler(handler);
    }

    public void stop() {
        if (handler == null) return;
        Logger root = Logger.getLogger("");
        root.removeHandler(handler);
        handler = null;
    }

    private static String toLevel(Level level) {
        if (level == null) return "INFO";
        if (level.intValue() >= Level.SEVERE.intValue()) return "ERROR";
        if (level.intValue() >= Level.WARNING.intValue()) return "WARN";
        if (level.intValue() <= Level.FINE.intValue()) return "DEBUG";
        return "INFO";
    }
}
