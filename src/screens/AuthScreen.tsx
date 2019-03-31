import React from 'react'
import {
  Alert,
  Image,
  Keyboard,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native'
import { KeyboardAvoidingView, Login, SignUp } from '../components'
import { PV } from '../resources'
import { Credentials, loginUser, signUpUser } from '../state/actions/auth'

type Props = {
  navigation?: any
  showSignUp?: boolean
}

type State = {
  showSignUp?: boolean
}

export class AuthScreen extends React.Component<Props, State> {

  scrollView: ScrollView

  constructor(props: Props) {
    super(props)
    this.state = {
      showSignUp: props.showSignUp || false
    }
  }

  attemptLogin = async (credentials: Credentials) => {
    const { navigation } = this.props

    try {
      await loginUser(credentials)
      if (navigation.getParam('isOnboarding', false)) {
        navigation.navigate(PV.RouteNames.MainApp)
      } else {
        navigation.goBack(null)
      }
    } catch (error) {
      Alert.alert('Error', error.message, [])
    }
  }

  attemptSignUp = async (credentials: Credentials) => {
    const { navigation } = this.props
    try {
      await signUpUser(credentials)
      if (navigation.getParam('isOnboarding', false)) {
        navigation.navigate(PV.RouteNames.MainApp)
      } else {
        navigation.goBack(null)
      }
    } catch (error) {
      Alert.alert('Error', error.message, [])
    }
  }

  switchOptions = () => {
    this.setState({ showSignUp: !this.state.showSignUp })
  }

  render() {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: PV.Colors.brandColor }}>
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <KeyboardAvoidingView style={{ backgroundColor: PV.Colors.brandColor }} scrollToOffset={(offest: number) => {
            this.scrollView.scrollTo({ x: 0, y: offest, animated: true }, 200)
          }}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.view} ref={(ref) => this.scrollView = ref}>
              <Image source={PV.Images.BANNER} style={styles.banner} resizeMode='contain' />
              <View style={styles.contentView}>
                {!this.state.showSignUp ? <Login onLoginPressed={this.attemptLogin} />
                  : <SignUp onSignUpPressed={this.attemptSignUp} />}
                <Text
                  onPress={this.switchOptions}
                  style={styles.switchOptionText}>
                  {this.state.showSignUp ? 'Login' : 'SignUp'}
                </Text>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
        {Platform.OS === 'ios' &&
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => this.props.navigation.goBack(null)}>
              <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>}
      </SafeAreaView>
    )
  }
}

const styles = StyleSheet.create({
  view: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: PV.Colors.brandColor,
    paddingTop: 60
  },
  closeButton: {
    position: 'absolute',
    top: 40
  },
  closeButtonText: {
    fontWeight: PV.Fonts.weights.bold,
    fontSize: PV.Fonts.sizes.md,
    padding: 15,
    color: PV.Colors.white
  },
  contentView: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center'
  },
  banner: {
    marginBottom: 60,
    width: '80%'
  },
  switchOptionText: {
    fontSize: 18,
    color: PV.Colors.white,
    marginTop: 30,
    textDecorationLine: 'underline'
  }
})
