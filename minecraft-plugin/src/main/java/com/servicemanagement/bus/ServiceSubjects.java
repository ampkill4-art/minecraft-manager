package com.servicemanagement.bus;

/**
 * Centralized subject strings for the Minecraft plugin.
 * Must mirror the subjects defined in the Node.js bridge.
 */
public final class ServiceSubjects {

    private ServiceSubjects() {}

    private static String sub(String serverId, String channel) {
        return "mc." + serverId + "." + channel;
    }

    public static String status(String id)      { return sub(id, "status"); }
    public static String commandReq(String id)  { return sub(id, "command.req"); }
    public static String commandRes(String id)  { return sub(id, "command.res"); }
    public static String chat(String id)        { return sub(id, "chat"); }
    public static String logs(String id)        { return sub(id, "logs"); }
    public static String fileReq(String id)     { return sub(id, "files.req"); }
    public static String fileRes(String id)     { return sub(id, "files.res"); }
    public static String players(String id)     { return sub(id, "players"); }
    public static String heartbeat(String id)   { return sub(id, "heartbeat"); }
    public static String backupReq(String id)   { return sub(id, "backup.req"); }
    public static String backupRes(String id)   { return sub(id, "backup.res"); }
}
