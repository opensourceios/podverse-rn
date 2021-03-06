import { StyleSheet, TouchableOpacity } from 'react-native'
import React, { useGlobal } from 'reactn'
import { PV } from '../resources'
import { ActivityIndicator, Text, View } from './'

type Props = {
  bottomActionHandler?: any
  bottomActionText?: string
  isLoading?: boolean
  message?: string
  subMessage?: string
  topActionHandler?: any
  topActionText?: string
}

export const MessageWithAction = (props: Props) => {
  const {
    bottomActionHandler,
    bottomActionText,
    isLoading,
    message,
    subMessage,
    topActionHandler,
    topActionText
  } = props
  const [globalTheme] = useGlobal('globalTheme')

  return (
    <View style={styles.view}>
      {!!message && (
        <Text fontSizeLargestScale={PV.Fonts.largeSizes.md} style={[globalTheme.text, styles.message]}>
          {message}
        </Text>
      )}
      {!!subMessage && (
        <Text fontSizeLargestScale={PV.Fonts.largeSizes.sm} style={[globalTheme.text, styles.subMessage]}>
          {subMessage}
        </Text>
      )}
      {!isLoading && !!topActionText && topActionHandler && (
        <TouchableOpacity onPress={topActionHandler}>
          <Text fontSizeLargestScale={PV.Fonts.largeSizes.sm} style={[styles.button, globalTheme.text]}>
            {topActionText}
          </Text>
        </TouchableOpacity>
      )}
      {!isLoading && !!bottomActionText && bottomActionHandler && (
        <TouchableOpacity onPress={bottomActionHandler}>
          <Text fontSizeLargestScale={PV.Fonts.largeSizes.sm} style={[styles.button, globalTheme.text]}>
            {bottomActionText}
          </Text>
        </TouchableOpacity>
      )}
      {isLoading && <ActivityIndicator />}
    </View>
  )
}

const styles = StyleSheet.create({
  button: {
    fontSize: PV.Fonts.sizes.xl,
    fontWeight: PV.Fonts.weights.bold,
    marginHorizontal: 16,
    marginVertical: 12,
    minHeight: 44
  },
  message: {
    fontSize: PV.Fonts.sizes.xl,
    marginHorizontal: 16,
    marginVertical: 12,
    textAlign: 'center'
  },
  subMessage: {
    fontSize: PV.Fonts.sizes.md,
    marginHorizontal: 16,
    marginVertical: 12,
    textAlign: 'center'
  },
  view: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center'
  }
})
