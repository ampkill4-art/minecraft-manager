package com.servicemanagement;

import com.servicemanagement.config.PluginConfig;
import com.servicemanagement.modules.*;
import com.servicemanagement.bus.ServiceBusClient;
import org.bukkit.plugin.java.JavaPlugin;

public class ServiceManagementPlugin extends JavaPlugin {

    private PluginConfig config;
    private ServiceBusClient serviceBusClient;

    private StatusReporter statusReporter;
    private CommandHandler commandHandler;
    private ChatBridge chatBridge;
    private FileAccessor fileAccessor;
    private BackupManager backupManager;
    private PermissionManager permissionManager;

    @Override
    public void onEnable() {
        // Load config
        config = new PluginConfig(this);
        config.load();

        // Initialize subject prefix
        com.servicemanagement.bus.ServiceSubjects.init(config.subjectPrefix);

        // Connect broker
        serviceBusClient = new ServiceBusClient(config.brokerUrl, getLogger());
        try {
            serviceBusClient.connect();
        } catch (Exception e) {
            // Silent by design
            getServer().getPluginManager().disablePlugin(this);
            return;
        }

        // Initialize and start modules
        statusReporter = new StatusReporter(this, serviceBusClient, config);
        statusReporter.runTaskTimerAsynchronously(this, 100L, config.statusIntervalSeconds * 20L);

        commandHandler = new CommandHandler(this, serviceBusClient, config);
        commandHandler.start();

        chatBridge = new ChatBridge(this, serviceBusClient, config);
        chatBridge.start();

        permissionManager = new PermissionManager(serviceBusClient, config, chatBridge);
        permissionManager.start();

        fileAccessor = new FileAccessor(this, serviceBusClient, config);
        fileAccessor.start();

        backupManager = new BackupManager(this, serviceBusClient, config);
        backupManager.start();

    }

    @Override
    public void onDisable() {
        if (statusReporter != null) {
            try { statusReporter.cancel(); } catch (Exception ignored) {}
        }
        if (commandHandler != null) commandHandler.stop();
        if (chatBridge != null) chatBridge.stop();
        if (permissionManager != null) permissionManager.stop();
        if (fileAccessor != null) fileAccessor.stop();
        if (backupManager != null) backupManager.stop();

        if (serviceBusClient != null) serviceBusClient.close();
        
    }
}
