import React, { Component } from 'react'
import { Animated, Dimensions, Keyboard, StyleSheet, TextInput, UIManager } from 'react-native'

const { State: TextInputState } = TextInput

type Props = {
  children: any,
  scrollToOffset: (offset: number) => any,
  style: any
}

export class KeyboardAvoidingView extends Component<Props> {
  state = {
    shift: new Animated.Value(0)
  }

  keyboardDidShowSub?: any = null
  keyboardDidHideSub?: any = null

  componentWillMount() {
    this.keyboardDidShowSub = Keyboard.addListener('keyboardDidShow', this.handleKeyboardDidShow)
    this.keyboardDidHideSub = Keyboard.addListener('keyboardDidHide', this.handleKeyboardDidHide)
  }

  componentWillUnmount() {
    this.keyboardDidShowSub.remove()
    this.keyboardDidHideSub.remove()
  }

  handleKeyboardDidShow = (event: any) => {
    const { height: windowHeight } = Dimensions.get('window')
    const keyboardHeight = event.endCoordinates.height
    const currentlyFocusedField = TextInputState.currentlyFocusedField()
    UIManager.measure(currentlyFocusedField, (originX, originY, width, height, pageX, pageY) => {
      const fieldHeight = height
      const fieldTop = pageY
      const gap = (windowHeight - keyboardHeight) - (fieldTop + fieldHeight)
      if (gap >= 0) {
        return
      }
      const padding = 15
      this.props.scrollToOffset(-(gap - padding))
    })
  }

  handleKeyboardDidHide = () => {
    this.props.scrollToOffset(0)
  }

  render() {
    const { children } = this.props
    const { shift } = this.state
    return (
        <Animated.View style={[styles.container, { transform: [{ translateY: shift }] }, this.props.style]}>
            {children}
        </Animated.View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%'
  }
})
