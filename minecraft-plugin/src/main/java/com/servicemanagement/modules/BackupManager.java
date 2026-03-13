package com.servicemanagement.modules;

import com.servicemanagement.config.PluginConfig;
import com.servicemanagement.bus.ServiceBusClient;
import com.servicemanagement.bus.ServiceSubjects;
import com.servicemanagement.bus.BusSubscription;
import org.bukkit.plugin.Plugin;
import org.bukkit.scheduler.BukkitRunnable;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

public class BackupManager {

    private final Plugin plugin;
    private final ServiceBusClient bus;
    private final PluginConfig config;
    private BusSubscription sub;
    private boolean isBackingUp = false;

    public static class BackupReq {
        public String action; // list, create
        public String requestId;
        public String serverId;
    }

    public BackupManager(Plugin plugin, ServiceBusClient bus, PluginConfig config) {
        this.plugin = plugin;
        this.bus = bus;
        this.config = config;
    }

    public void start() {
        if (!config.enableBackups) return;

        File backupDir = new File(plugin.getServer().getWorldContainer(), config.backupDirectory);
        if (!backupDir.exists()) backupDir.mkdirs();

        sub = bus.subscribeEnvelope(ServiceSubjects.backupReq(config.serverId), BackupReq.class, config.bridgeToken, (env, req) -> {
            if (req == null || req.action == null) return;
            
            // Run asynchronously
            new BukkitRunnable() {
                @Override
                public void run() {
                    if (req.action.equalsIgnoreCase("create")) {
                        handleCreate(req);
                    } else if (req.action.equalsIgnoreCase("list")) {
                        handleList(req);
                    }
                }
            }.runTaskAsynchronously(plugin);
        });
    }

    public void stop() {
        if (sub != null) sub.unsubscribe();
    }

    private void handleCreate(BackupReq req) {
        if (isBackingUp) {
            sendResponse(req.requestId, false, "Backup already in progress", null);
            return;
        }
        isBackingUp = true;
        
        try {
            File worldDir = new File(plugin.getServer().getWorldContainer(), "world");
            if (!worldDir.exists()) {
                sendResponse(req.requestId, false, "World directory not found", null);
                return;
            }

            File backupDir = new File(plugin.getServer().getWorldContainer(), config.backupDirectory);
            String date = new SimpleDateFormat("yyyy-MM-dd_HH-mm-ss").format(new Date());
            File zipFile = new File(backupDir, "world_" + date + ".zip");

            try (FileOutputStream fos = new FileOutputStream(zipFile);
                 ZipOutputStream zos = new ZipOutputStream(fos)) {
                zipFile(worldDir, worldDir.getName(), zos);
            }

            pruneOldBackups(backupDir);
            sendResponse(req.requestId, true, "Backup created: " + zipFile.getName(), null);

        } catch (Exception e) {
            sendResponse(req.requestId, false, "Backup failed: " + e.getMessage(), null);
        } finally {
            isBackingUp = false;
        }
    }

    private void zipFile(File fileToZip, String fileName, ZipOutputStream zipOut) throws IOException {
        if (fileToZip.isHidden()) return;
        if (fileToZip.isDirectory()) {
            if (fileName.endsWith("/")) {
                zipOut.putNextEntry(new ZipEntry(fileName));
            } else {
                zipOut.putNextEntry(new ZipEntry(fileName + "/"));
            }
            zipOut.closeEntry();
            File[] children = fileToZip.listFiles();
            if (children != null) {
                for (File childFile : children) {
                    zipFile(childFile, fileName + "/" + childFile.getName(), zipOut);
                }
            }
            return;
        }

        try (FileInputStream fis = new FileInputStream(fileToZip)) {
            ZipEntry zipEntry = new ZipEntry(fileName);
            zipOut.putNextEntry(zipEntry);
            byte[] bytes = new byte[1024 * 8];
            int length;
            while ((length = fis.read(bytes)) >= 0) {
                zipOut.write(bytes, 0, length);
            }
        }
    }

    private void pruneOldBackups(File backupDir) {
        File[] files = backupDir.listFiles((dir, name) -> name.endsWith(".zip"));
        if (files == null || files.length <= config.maxBackups) return;

        Arrays.sort(files, Comparator.comparingLong(File::lastModified));
        int toDelete = files.length - config.maxBackups;
        
        for (int i = 0; i < toDelete; i++) {
            files[i].delete();
        }
    }

    private void handleList(BackupReq req) {
        File backupDir = new File(plugin.getServer().getWorldContainer(), config.backupDirectory);
        File[] files = backupDir.listFiles((dir, name) -> name.endsWith(".zip"));
        
        List<Map<String, Object>> backupList = new ArrayList<>();
        if (files != null) {
            Arrays.sort(files, Comparator.comparingLong(File::lastModified).reversed());
            for (File f : files) {
                Map<String, Object> b = new HashMap<>();
                b.put("name", f.getName());
                b.put("size", f.length());
                b.put("createdAt", f.lastModified());
                backupList.add(b);
            }
        }
        sendResponse(req.requestId, true, null, backupList);
    }

    private void sendResponse(String reqId, boolean success, String message, List<Map<String, Object>> backups) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("requestId", reqId);
        payload.put("success", success);
        if (message != null) payload.put("message", message);
        if (backups != null) payload.put("backups", backups);

        Map<String, Object> env = new HashMap<>();
        env.put("serverId", config.serverId);
        env.put("type", "backup_res");
        env.put("timestamp", System.currentTimeMillis());
        env.put("payload", payload);

        bus.publish(ServiceSubjects.backupRes(config.serverId), env);
    }
}
