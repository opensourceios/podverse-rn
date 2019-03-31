export interface GlobalTheme {
  buttonPrimaryText?: any
  buttonPrimaryTextDisabled?: any
  buttonPrimaryWrapper?: any
  buttonPrimaryWrapperDisabled?: any
  player?: any
  tabbar?: any
  tabbarItem?: any
  tableCellTextPrimary?: any
  tableCellTextSecondary?: any
  tableSectionHeader?: any
  tableSectionHeaderText?: any
  text?: any
  view?: any
}

export interface UserInfo {
  email?: string,
  freeTrialExpiration?: string,
  historyItems?: [],
  id?: string,
  membershipExpiration?: string | null,
  name?: string,
  playlists?: [],
  queueItems?: [],
  subscribedPlaylistIds?: [],
  subscribedPodcastIds?: [],
  subscribedUserIds?: []
}

export interface InitialState {
  globalTheme: GlobalTheme,
  session: {
    userInfo: UserInfo,
    isLoggedIn: boolean
  },
  showPlayer: boolean,
  subscribedPodcasts: [{}]
}

interface FontSizes {
  xs: number,
  sm: number,
  md: number,
  lg: number,
  xl: number
}

interface FontWeight {
  thin: string,
  normal: string,
  bold: string,
  extraBold: string
}

export interface FontType {
  sizes: FontSizes,
  weights: FontWeight
}

export interface ISettings {
  nsfwMode: boolean
}
