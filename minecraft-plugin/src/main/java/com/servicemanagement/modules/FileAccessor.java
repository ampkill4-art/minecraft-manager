package com.servicemanagement.modules;

import com.servicemanagement.config.PluginConfig;
import com.servicemanagement.bus.ServiceBusClient;
import com.servicemanagement.bus.ServiceSubjects;
import com.servicemanagement.bus.BusSubscription;
import org.bukkit.plugin.Plugin;
import org.bukkit.scheduler.BukkitRunnable;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class FileAccessor {

    private final Plugin plugin;
    private final ServiceBusClient bus;
    private final PluginConfig config;
    private BusSubscription sub;
    private final File rootDir;

    public static class FileReq {
        public String path;
        public String action;
        public String requestId;
        public String serverId;
    }

    public FileAccessor(Plugin plugin, ServiceBusClient bus, PluginConfig config) {
        this.plugin = plugin;
        this.bus = bus;
        this.config = config;
        this.rootDir = plugin.getServer().getWorldContainer().getAbsoluteFile();
    }

    public void start() {
        if (!config.enableFileAccess) return;

        sub = bus.subscribeEnvelope(ServiceSubjects.fileReq(config.serverId), FileReq.class, (env, req) -> {
            if (req == null || req.path == null) return;
            
            // Run async io
            new BukkitRunnable() {
                @Override
                public void run() {
                    if ("read".equalsIgnoreCase(req.action)) {
                        handleRead(req);
                    } else {
                        handleList(req);
                    }
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
                sendResponse(req.requestId, false, "Access denied: outside root directory", null, null);
                return;
            }

            if (!targetDir.exists() || !targetDir.isDirectory()) {
                sendResponse(req.requestId, false, "Directory not found", null, null);
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
                    entry.put("lastModified", f.lastModified());

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
            sendResponse(req.requestId, true, null, fileList, null);

        } catch (Exception e) {
            sendResponse(req.requestId, false, e.getMessage(), null, null);
        }
    }

    private void handleRead(FileReq req) {
        try {
            File targetFile = new File(rootDir, req.path.replace("..", "")).getCanonicalFile();

            if (!targetFile.getPath().startsWith(rootDir.getCanonicalPath())) {
                sendResponse(req.requestId, false, "Access denied: outside root directory", null, null);
                return;
            }

            if (!targetFile.exists() || !targetFile.isFile()) {
                sendResponse(req.requestId, false, "File not found", null, null);
                return;
            }

            long size = targetFile.length();
            if (size > config.maxFileReadBytes) {
                sendResponse(req.requestId, false, "File too large to read", null, null);
                return;
            }

            byte[] data = Files.readAllBytes(targetFile.toPath());
            String content = new String(data, StandardCharsets.UTF_8);
            sendResponse(req.requestId, true, null, null, content);
        } catch (Exception e) {
            sendResponse(req.requestId, false, e.getMessage(), null, null);
        }
    }

    private void sendResponse(String reqId, boolean success, String error, List<Map<String, Object>> files, String content) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("requestId", reqId);
        payload.put("success", success);
        if (error != null) payload.put("error", error);
        if (files != null) payload.put("files", files);
        if (content != null) payload.put("content", content);

        Map<String, Object> env = new HashMap<>();
        env.put("serverId", config.serverId);
        env.put("type", "file_res");
        env.put("timestamp", System.currentTimeMillis());
        env.put("payload", payload);

        bus.publish(ServiceSubjects.fileRes(config.serverId), env);
    }
}
