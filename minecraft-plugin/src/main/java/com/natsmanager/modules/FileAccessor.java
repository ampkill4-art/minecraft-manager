package com.natsmanager.modules;

import com.natsmanager.config.PluginConfig;
import com.natsmanager.nats.NatsClient;
import com.natsmanager.nats.NatsSubjects;
import io.nats.client.Subscription;
import org.bukkit.plugin.Plugin;
import org.bukkit.scheduler.BukkitRunnable;

import java.io.File;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class FileAccessor {

    private final Plugin plugin;
    private final NatsClient nats;
    private final PluginConfig config;
    private Subscription sub;
    private final File rootDir;

    public static class FileReq {
        public String path;
        public String requestId;
        public String serverId;
    }

    public FileAccessor(Plugin plugin, NatsClient nats, PluginConfig config) {
        this.plugin = plugin;
        this.nats = nats;
        this.config = config;
        this.rootDir = plugin.getServer().getWorldContainer().getAbsoluteFile();
    }

    public void start() {
        if (!config.enableFileAccess) return;

        sub = nats.subscribe(NatsSubjects.fileReq(config.serverId), FileReq.class, req -> {
            if (req == null || req.path == null) return;
            
            // Run async io
            new BukkitRunnable() {
                @Override
                public void run() {
                    handleList(req);
                }
            }.runTaskAsynchronously(plugin);
        });
    }

    public void stop() {
        if (sub != null) sub.unsubscribe();
    }

    private void handleList(FileReq req) {
        try {
            File targetDir = new File(rootDir, req.path.replace("..", "")).getCanonicalFile();
            
            // Path traversal protection
            if (!targetDir.getPath().startsWith(rootDir.getCanonicalPath())) {
                sendResponse(req.requestId, false, "Access denied: outside root directory", null);
                return;
            }

            if (!targetDir.exists() || !targetDir.isDirectory()) {
                sendResponse(req.requestId, false, "Directory not found", null);
                return;
            }

            File[] files = targetDir.listFiles();
            List<Map<String, Object>> fileList = new ArrayList<>();
            
            if (files != null) {
                // Determine relative path to root to send to frontend
                Path rootPathStr = rootDir.toPath().toAbsolutePath().normalize();
                
                for (File f : files) {
                    Map<String, Object> entry = new HashMap<>();
                    entry.put("name", f.getName());
                    entry.put("isDirectory", f.isDirectory());
                    entry.put("size", f.length());

                    // relative path calculation for frontend nav
                    Path filePath = f.toPath().toAbsolutePath().normalize();
                    String relative = rootPathStr.relativize(filePath).toString();
                    // normalize specifically to forward slash so UI logic doesn't break
                    relative = relative.replace('\\', '/');
                    if (!relative.startsWith("/")) {
                        relative = "/" + relative;
                    }
                    entry.put("path", relative);
                    
                    fileList.add(entry);
                }
            }
            sendResponse(req.requestId, true, null, fileList);

        } catch (Exception e) {
            sendResponse(req.requestId, false, e.getMessage(), null);
        }
    }

    private void sendResponse(String reqId, boolean success, String error, List<Map<String, Object>> files) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("requestId", reqId);
        payload.put("success", success);
        if (error != null) payload.put("error", error);
        if (files != null) payload.put("files", files);

        Map<String, Object> env = new HashMap<>();
        env.put("serverId", config.serverId);
        env.put("type", "file_res");
        env.put("timestamp", System.currentTimeMillis());
        env.put("payload", payload);

        nats.publish(NatsSubjects.fileRes(config.serverId), env);
    }
}
