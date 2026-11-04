#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE (AppwinAnalyticsModule, NSObject)

RCT_EXTERN_METHOD(initialize:(NSDictionary *)options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(isReady:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(track:(NSString *)name
                  props:(NSDictionary *)props
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(screen:(NSString *)name
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(flush:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(setConsent:(NSString *)consent
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(recordBridgedError:(BOOL)fatal
                  type:(NSString *)type
                  message:(NSString *)message
                  frames:(NSArray *)frames
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Blocking: the app dies right after a fatal JS error, the report must be on
// disk before JS gets control back.
RCT_EXTERN__BLOCKING_SYNCHRONOUS_METHOD(recordBridgedErrorSync:(BOOL)fatal
                                        type:(NSString *)type
                                        message:(NSString *)message
                                        frames:(NSArray *)frames)

@end
