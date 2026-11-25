package org.hlrcs.service;

/** Add a resolver to integrate another domain without changing conversations or message storage. */
public interface MessagingContextResolver {
    String kind();
    MessagingService.Reference resolve(Integer id,Integer viewer,Integer peer,boolean sending);
}
