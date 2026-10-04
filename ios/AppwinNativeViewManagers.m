#import <React/RCTViewManager.h>

// The names exposed to JavaScript drop the `Manager` suffix: that is React
// Native's convention, and what `requireNativeComponent` expects in `views.tsx`.
@interface RCT_EXTERN_MODULE (AppwinCommunityViewManager, RCTViewManager)
@end

@interface RCT_EXTERN_MODULE (AppwinSupportMessengerViewManager, RCTViewManager)
@end
