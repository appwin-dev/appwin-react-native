#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE (AppwinNotificationsModule, NSObject)

RCT_EXTERN_METHOD(registerPushToken:(NSString *)token
                  platform:(NSString *)platform
                  pushOptIn:(nonnull NSNumber *)pushOptIn
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(trackEvent:(NSString *)event
                  eventName:(nullable NSString *)eventName
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(track:(NSString *)deliveryId
                  event:(NSString *)event
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(fetchPendingMessages:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(syncOnAppOpen:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
