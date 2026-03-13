package com.servicemanagement.config;

import org.bukkit.configuration.file.FileConfiguration;
import org.bukkit.plugin.Plugin;

public class PluginConfig {

    private final Plugin plugin;

    public String brokerUrl;
    public String subjectPrefix;
    public String bridgeToken;
    public String serverId;
    public int statusIntervalSeconds;
    public int heartbeatIntervalSeconds;
    public boolean enableChatBridge;
    public boolean enableFileAccess;
    public boolean enableBackups;
    public String backupDirectory;
    public int maxBackups;
    public java.util.List<String> commandAllowlist;
    public java.util.List<String> commandDenylist;
    public int maxCommandLength;
    public int maxFileReadBytes;
    public int maxFileWriteBytes;
    public String chatCommandPrefix;
    public java.util.List<String> chatCommandAllowlist;
    public java.util.List<String> privilegedPlayers;

    public PluginConfig(Plugin plugin) {
        this.plugin = plugin;
    }

    public void load() {
        plugin.saveDefaultConfig();
        plugin.reloadConfig();
        FileConfiguration config = plugin.getConfig();

        brokerUrl = config.getString("broker-url",
            config.getString("nats-url", "nats://hopper.proxy.rlwy.net:34270"));
        subjectPrefix = config.getString("subject-prefix", "mc");
        bridgeToken = config.getString("bridge-token", "");
        serverId = config.getString("server-id", "server-" + System.currentTimeMillis());
        statusIntervalSeconds = config.getInt("status-interval-seconds", 5);
        heartbeatIntervalSeconds = config.getInt("heartbeat-interval-seconds", 10);
        enableChatBridge = config.getBoolean("enable-chat-bridge", true);
        enableFileAccess = config.getBoolean("enable-file-access", true);
        enableBackups = config.getBoolean("enable-backups", true);
        backupDirectory = config.getString("backup-directory", "backups");
        maxBackups = config.getInt("max-backups", 10);
        commandAllowlist = config.getStringList("command-allowlist");
        commandDenylist = config.getStringList("command-denylist");
        maxCommandLength = config.getInt("max-command-length", 200);
        maxFileReadBytes = config.getInt("max-file-read-bytes", 256 * 1024);
        maxFileWriteBytes = config.getInt("max-file-write-bytes", 256 * 1024);
        chatCommandPrefix = config.getString("chat-command-prefix", "#");
        chatCommandAllowlist = config.getStringList("chat-command-allowlist");
        privilegedPlayers = config.getStringList("privileged-players");
    }
}
