package com.natsmanager;

import com.natsmanager.config.PluginConfig;
import com.natsmanager.modules.*;
import com.natsmanager.nats.NatsClient;
import org.bukkit.plugin.java.JavaPlugin;

public class NatsManagerPlugin extends JavaPlugin {

    private PluginConfig config;
    private NatsClient natsClient;

    private StatusReporter statusReporter;
    private CommandHandler commandHandler;
    private ChatBridge chatBridge;
    private BukkitLogStreamer logStreamer;
    private FileAccessor fileAccessor;
    private BackupManager backupManager;

    @Override
    public void onEnable() {
        getLogger().info("Initializing NatsManager Plugin...");

        // Load config
        config = new PluginConfig(this);
        config.load();

        // Connect NATS
        natsClient = new NatsClient(config.natsUrl, getLogger());
        try {
            natsClient.connect();
        } catch (Exception e) {
            getLogger().severe("Failed to connect to NATS Broker! " + e.getMessage());
            e.printStackTrace();
            getServer().getPluginManager().disablePlugin(this);
            return;
        }

        // Initialize and start modules
        statusReporter = new StatusReporter(this, natsClient, config);
        statusReporter.runTaskTimerAsynchronously(this, 100L, config.statusIntervalSeconds * 20L);

        commandHandler = new CommandHandler(this, natsClient, config);
        commandHandler.start();

        chatBridge = new ChatBridge(this, natsClient, config);
        chatBridge.start();

        logStreamer = new BukkitLogStreamer(natsClient, config);
        logStreamer.start();

        fileAccessor = new FileAccessor(this, natsClient, config);
        fileAccessor.start();

        backupManager = new BackupManager(this, natsClient, config);
        backupManager.start();

        getLogger().info("NatsManager started! Server ID: " + config.serverId);
    }

    @Override
    public void onDisable() {
        getLogger().info("Disabling NatsManager...");

        if (statusReporter != null) {
            try { statusReporter.cancel(); } catch (Exception ignored) {}
        }
        if (commandHandler != null) commandHandler.stop();
        if (chatBridge != null) chatBridge.stop();
        if (logStreamer != null) logStreamer.stop();
        if (fileAccessor != null) fileAccessor.stop();
        if (backupManager != null) backupManager.stop();

        if (natsClient != null) natsClient.close();
        
        getLogger().info("NatsManager disabled.");
    }
}
