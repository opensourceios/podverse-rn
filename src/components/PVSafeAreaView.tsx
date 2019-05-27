import React from 'react'
import { SafeAreaView, StyleSheet } from 'react-native'
import { useGlobal } from 'reactn'

type Props = {
  children: any
}

export const PVSafeAreaView = (props: Props) => {
  const [globalTheme] = useGlobal('globalTheme')
  return <SafeAreaView style={[styles.safeAreaView, globalTheme.view]}>{props.children}</SafeAreaView>
}

const styles = StyleSheet.create({
  safeAreaView: {
    flex: 1
  }
})