import { Alert, Linking, SectionList, TouchableWithoutFeedback, View as RNView } from 'react-native'
import { Badge } from 'react-native-elements'
import React from 'reactn'
import { Divider, TableSectionHeader, Text, View } from '../components'
import { getMembershipStatus } from '../lib/utility'
import { PV } from '../resources'
import { gaTrackPageView } from '../services/googleAnalytics'
import { logoutUser } from '../state/actions/auth'
import { core, getMembershipTextStyle, table } from '../styles'

type Props = {
  navigation?: any
}

type State = {
  options: any[]
}

export class MoreScreen extends React.Component<Props, State> {
  static navigationOptions = ({ navigation }) => {
    return {
      title: 'More'
    }
  }

  state = {
    options: []
  }

  componentDidMount() {
    gaTrackPageView('/more', 'More Screen')
  }

  _onPress = (item: any) => {
    const { navigation } = this.props
    if (item.key === _membershipKey) {
      navigation.navigate(PV.RouteNames.MembershipScreen)
    } else if (item.key === _aboutKey) {
      navigation.navigate(PV.RouteNames.AboutScreen)
    } else if (item.key === _faqKey) {
      navigation.navigate(PV.RouteNames.FAQScreen)
    } else if (item.key === _contactKey) {
      Alert.alert(PV.Alerts.LEAVING_APP.title, PV.Alerts.LEAVING_APP.message, [
        { text: 'Cancel' },
        { text: 'Yes', onPress: () => Linking.openURL(PV.URLs.contact) }
      ])
    } else if (item.key === _termsKey) {
      navigation.navigate(PV.RouteNames.TermsOfServiceScreen)
    } else if (item.key === _logoutKey) {
      logoutUser()
    } else if (item.key === _loginKey) {
      navigation.navigate(PV.RouteNames.AuthNavigator)
    } else if (item.key === PV.RouteNames.MyProfileScreen) {
      const user = this.global.session.userInfo
      navigation.navigate(PV.RouteNames.ProfileScreen, {
        user,
        navigationTitle: 'My Profile',
        isMyProfile: true
      })
    } else if (item.key === PV.RouteNames.MyProfileClipsScreen) {
      const user = this.global.session.userInfo
      navigation.navigate(PV.RouteNames.ProfileScreen, {
        user,
        navigationTitle: 'My Profile',
        isMyProfile: true,
        initializeClips: true
      })
    } else {
      navigation.navigate(item.key)
    }
  }

  render() {
    const { downloadsActive, fontScaleMode, globalTheme, session } = this.global
    const { isLoggedIn = false, userInfo } = session
    const options = moreFeaturesOptions()

    let downloadsActiveCount = 0
    for (const id of Object.keys(downloadsActive)) {
      if (downloadsActive[id]) downloadsActiveCount++
    }

    const featureOptions = options.filter((item = { key: '', title: '' }) => {
      if (isLoggedIn) {
        return item.key !== _loginKey
      } else {
        return item.key !== _logoutKey
      }
    })

    const membershipStatus = getMembershipStatus(userInfo) || 'Membership'
    const membershipTextStyle = getMembershipTextStyle(globalTheme, membershipStatus)
    const otherOptions = moreOtherOptions(membershipStatus)

    return (
      <View style={core.backgroundView}>
        <SectionList
          ItemSeparatorComponent={() => <Divider />}
          renderItem={({ item }) => (
            <TouchableWithoutFeedback onPress={() => this._onPress(item)}>
              <RNView style={[core.row, table.cellWrapper]}>
                {item.key === _membershipKey && (
                  <RNView style={[core.row, table.cellWrapper]}>
                    {isLoggedIn ? (
                      <Text fontSizeLargestScale={PV.Fonts.largeSizes.md} style={[table.cellText, membershipTextStyle]}>
                        {membershipStatus}
                      </Text>
                    ) : (
                      <Text
                        fontSizeLargestScale={PV.Fonts.largeSizes.md}
                        style={[table.cellText, globalTheme.tableCellTextPrimary]}>
                        Membership
                      </Text>
                    )}
                  </RNView>
                )}
                {item.key === PV.RouteNames.DownloadsScreen && (
                  <RNView style={[core.row, { position: 'relative' }, table.cellWrapper]}>
                    <Text fontSizeLargestScale={PV.Fonts.largeSizes.md} style={table.cellText}>
                      Downloads
                    </Text>
                    {downloadsActiveCount > 0 &&
                      fontScaleMode !== PV.Fonts.fontScale.larger &&
                      fontScaleMode !== PV.Fonts.fontScale.largest && (
                        <Badge
                          containerStyle={{
                            position: 'absolute',
                            right: -22,
                            top: 19
                          }}
                          status='error'
                          value={downloadsActiveCount}
                        />
                      )}
                  </RNView>
                )}
                {item.key !== _membershipKey && item.key !== PV.RouteNames.DownloadsScreen && (
                  <Text
                    fontSizeLargestScale={PV.Fonts.largeSizes.md}
                    style={[table.cellText, globalTheme.tableCellTextPrimary]}>
                    {item.title}
                  </Text>
                )}
              </RNView>
            </TouchableWithoutFeedback>
          )}
          renderSectionHeader={({ section: { title } }) => <TableSectionHeader title={title} />}
          sections={[
            { title: 'Features', data: featureOptions },
            { title: 'Other', data: otherOptions }
          ]}
        />
      </View>
    )
  }
}

const _aboutKey = 'about'
const _contactKey = 'contact'
const _faqKey = 'faq'
const _membershipKey = 'membership'
const _termsKey = 'terms'
const _logoutKey = 'logout'
const _loginKey = 'login'

const moreFeaturesOptions = () => {
  const items = [
    {
      title: 'Downloads',
      key: PV.RouteNames.DownloadsScreen
    },
    {
      title: 'Playlists',
      key: PV.RouteNames.PlaylistsScreen
    },
    {
      title: 'Profiles',
      key: PV.RouteNames.ProfilesScreen
    },
    {
      title: 'My Profile',
      key: PV.RouteNames.MyProfileScreen
    },
    {
      title: 'My Clips',
      key: PV.RouteNames.MyProfileClipsScreen
    },
    {
      title: 'Log out',
      key: _logoutKey
    },
    {
      title: 'Login',
      key: _loginKey
    },
    {
      title: 'Settings',
      key: PV.RouteNames.SettingsScreen
    }
  ]

  return items
}

const moreOtherOptions = (membershipStatus?: string) => {
  const options = [
    {
      title: membershipStatus,
      key: _membershipKey
    },
    {
      title: 'Add Podcast by RSS',
      key: PV.RouteNames.AddPodcastByRSSScreen
    },
    {
      title: 'Contact Us',
      key: _contactKey
    },
    {
      title: 'FAQ',
      key: _faqKey
    },
    {
      title: 'Terms',
      key: _termsKey
    },
    {
      title: 'About',
      key: _aboutKey
    }
  ]

  return options
}
