package com.servicemanagement.bus;

import io.nats.client.Dispatcher;

public class BusSubscription {
    private final Dispatcher dispatcher;
    private final String subject;

    public BusSubscription(Dispatcher dispatcher, String subject) {
        this.dispatcher = dispatcher;
        this.subject = subject;
    }

    public void unsubscribe() {
        dispatcher.unsubscribe(subject);
    }
}
