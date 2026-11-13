#import <React/RCTViewManager.h>

// The names exposed to JavaScript drop the `Manager` suffix: that is React
// Native's convention, and what `requireNativeComponent` expects in `views.tsx`.
@interface RCT_EXTERN_MODULE (AppwinCommunityViewManager, RCTViewManager)
RCT_EXPORT_VIEW_PROPERTY(profileEditing, NSDictionary)
RCT_EXPORT_VIEW_PROPERTY(onProfileEditRequest, RCTDirectEventBlock)
@end

@interface RCT_EXTERN_MODULE (AppwinSupportMessengerViewManager, RCTViewManager)
@end

@interface RCT_EXTERN_MODULE (AppwinMaskViewManager, RCTViewManager)
@end

@interface RCT_EXTERN_MODULE (AppwinUnmaskViewManager, RCTViewManager)
@end
