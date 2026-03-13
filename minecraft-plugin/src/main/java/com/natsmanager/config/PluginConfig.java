package com.natsmanager.config;

import org.bukkit.configuration.file.FileConfiguration;
import org.bukkit.plugin.Plugin;

public class PluginConfig {

    private final Plugin plugin;

    public String natsUrl;
    public String serverId;
    public int statusIntervalSeconds;
    public int heartbeatIntervalSeconds;
    public boolean enableChatBridge;
    public boolean enableLogStreaming;
    public boolean enableFileAccess;
    public boolean enableBackups;
    public String backupDirectory;
    public int maxBackups;

    public PluginConfig(Plugin plugin) {
        this.plugin = plugin;
    }

    public void load() {
        plugin.saveDefaultConfig();
        plugin.reloadConfig();
        FileConfiguration config = plugin.getConfig();

        natsUrl = config.getString("nats-url", "nats://hopper.proxy.rlwy.net:19506");
        serverId = config.getString("server-id", "server-" + System.currentTimeMillis());
        statusIntervalSeconds = config.getInt("status-interval-seconds", 5);
        heartbeatIntervalSeconds = config.getInt("heartbeat-interval-seconds", 10);
        enableChatBridge = config.getBoolean("enable-chat-bridge", true);
        enableLogStreaming = config.getBoolean("enable-log-streaming", true);
        enableFileAccess = config.getBoolean("enable-file-access", true);
        enableBackups = config.getBoolean("enable-backups", true);
        backupDirectory = config.getString("backup-directory", "backups");
        maxBackups = config.getInt("max-backups", 10);
    }
}
