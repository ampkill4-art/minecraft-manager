package com.natsmanager.modules;

import com.natsmanager.config.PluginConfig;
import com.natsmanager.nats.NatsClient;
import com.natsmanager.nats.NatsSubjects;
import io.nats.client.Subscription;
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
    private final NatsClient nats;
    private final PluginConfig config;
    private Subscription sub;
    private boolean isBackingUp = false;

    public static class BackupReq {
        public String action; // list, create
        public String requestId;
        public String serverId;
    }

    public BackupManager(Plugin plugin, NatsClient nats, PluginConfig config) {
        this.plugin = plugin;
        this.nats = nats;
        this.config = config;
    }

    public void start() {
        if (!config.enableBackups) return;

        File backupDir = new File(plugin.getServer().getWorldContainer(), config.backupDirectory);
        if (!backupDir.exists()) backupDir.mkdirs();

        sub = nats.subscribe(NatsSubjects.backupReq(config.serverId), BackupReq.class, req -> {
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

            plugin.getLogger().info("Starting backup: " + zipFile.getName());

            try (FileOutputStream fos = new FileOutputStream(zipFile);
                 ZipOutputStream zos = new ZipOutputStream(fos)) {
                zipFile(worldDir, worldDir.getName(), zos);
            }

            pruneOldBackups(backupDir);
            plugin.getLogger().info("Backup complete: " + zipFile.getName());
            sendResponse(req.requestId, true, "Backup created: " + zipFile.getName(), null);

        } catch (Exception e) {
            plugin.getLogger().severe("Backup failed: " + e.getMessage());
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
            if (files[i].delete()) {
                plugin.getLogger().info("Pruned old backup: " + files[i].getName());
            }
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

        nats.publish(NatsSubjects.backupRes(config.serverId), env);
    }
}
