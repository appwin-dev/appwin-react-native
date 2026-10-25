/**
 * Profile fields the host app manages itself, and where to send the member to
 * change them. Each handler left out keeps that field editable in the SDK.
 */
export interface AppwinProfileEditingHandlers {
  /**
   * Your own profile editor, in place of the SDK's: every place that would
   * open the SDK's editor (the edit button of the member's profile, "set up my
   * profile" in the composer) calls this instead.
   */
  onEditProfile?: () => void
  /**
   * The photo is yours: tapping it in the SDK's editor calls this instead of
   * opening the photo library.
   */
  onEditProfilePhoto?: () => void
  /**
   * The name is yours: tapping it in the SDK's editor calls this instead of
   * editing it in place, and the anonymity switch is hidden, since going
   * anonymous would replace your name with a generated one.
   */
  onEditProfileName?: () => void
}

/** What native is told: which handlers exist, never the handlers. */
export interface ProfileEditingFlags {
  profile: boolean
  photo: boolean
  name: boolean
}

export function profileEditingFlags(handlers: AppwinProfileEditingHandlers): ProfileEditingFlags {
  return {
    profile: handlers.onEditProfile != null,
    photo: handlers.onEditProfilePhoto != null,
    name: handlers.onEditProfileName != null,
  }
}

/** The handler native asked for, by field name. */
export function profileEditingHandler(
  handlers: AppwinProfileEditingHandlers,
  field: unknown,
): (() => void) | undefined {
  switch (field) {
    case 'profile':
      return handlers.onEditProfile
    case 'photo':
      return handlers.onEditProfilePhoto
    case 'name':
      return handlers.onEditProfileName
    default:
      return undefined
  }
}
