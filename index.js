/**
 * @providesModule LinkedInModal
 * @flow
 */

import React from 'react'
import {
  WebView,
  TouchableOpacity,
  View,
  ViewPropTypes,
  Text,
  Modal,
  StyleSheet,
  Image,
  // $DisableFlow
} from 'react-native'
import PropTypes from 'prop-types'
import { pipe, evolve, propSatisfies, applySpec, propOr } from 'ramda'
import { v4 } from 'uuid'
import querystring from 'query-string'

const AUTHORIZATION_URL: string =
  'https://auth.almaconnect.com/auth/social_sync'
const ACCESS_TOKEN_URL: string =
  'https://auth.almaconnect.com/auth'

export type LinkedInToken = {
  access_token?: string,
  expires_in?: number,
}

export type ErrorType = {
  type?: string,
  message?: string,
}

type State = {
  raceCondition: boolean,
  modalVisible: boolean,
}

/* eslint-disable */
type Props = {
  onSuccess: (LinkedInToken | {}) => void,
  onError: ErrorType => void,
  onOpen?: void => void,
  onClose?: void => void,
  linkText?: string,
  renderButton?: void => any,
  renderClose?: void => any,
  containerStyle?: any,
  wrapperStyle?: any,
  closeStyle?: any,
  animationType?: 'none' | 'fade' | 'slide',
}
/* eslint-enable */

export const cleanUrlString = (state: string) => state.replace('#!', '')

export const getTokenFromUrl: string => Object = pipe(
  querystring.extract,
  querystring.parse,
)

export const getErrorFromUrl: string => Object = pipe(
  querystring.extract,
  querystring.parse,
  evolve({ error_description: cleanUrlString }),
)

export const transformError: Object => Object = applySpec({
  type: propOr('', 'error'),
  message: propOr('', 'error_description'),
})

export const isErrorUrl: string => boolean = pipe(
  querystring.extract,
  querystring.parse,
  propSatisfies(error => typeof error !== 'undefined', 'error'),
)

export const getAuthorizationUrl: Props => string = ({
  provider
}) =>
  `${AUTHORIZATION_URL}/${provider}?${querystring.stringify({
    key: 'mobile_sync',
    format: 'json'
  })}`


export const injectedJavaScript = () =>
  'document.querySelector("input[type=text]")' +
  '.setAttribute("autocapitalize", "off")'


const styles = StyleSheet.create({
  constainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: 40,
    paddingHorizontal: 10,
  },
  wrapper: {
    flex: 1,
    borderRadius: 5,
    borderWidth: 10,
    borderColor: 'rgba(0, 0, 0, 0.6)',
  },
  close: {
    position: 'absolute',
    top: 35,
    right: 5,
    backgroundColor: '#000',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.4)',
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
})

export default class LinkedInModal extends React.Component {
  static propTypes = {
    onSuccess: PropTypes.func.isRequired,
    onError: PropTypes.func,
    onOpen: PropTypes.func,
    onClose: PropTypes.func,
    linkText: PropTypes.string,
    renderButton: PropTypes.func,
    renderClose: PropTypes.func,
    containerStyle: ViewPropTypes.style,
    wrapperStyle: ViewPropTypes.style,
    closeStyle: ViewPropTypes.style,
    animationType: Modal.propTypes.animationType,
  }
  static defaultProps = {
    onError: (error: ErrorType) =>
    // eslint-disable-next-line
      console.error(JSON.stringify(error, null, 2)),
    linkText: 'Login with LinkedIn',
    animationType: 'fade',
    containerStyle: StyleSheet.create({}),
    wrapperStyle: StyleSheet.create({}),
    closeStyle: StyleSheet.create({}),
  }
  state: State = {
    raceCondition: false,
    modalVisible: false,
  }

  onLoadStart = async ({ nativeEvent: { url } }: Object) => {
    const { raceCondition } = this.state
    const { provider, redirectUri, onError } = this.props

    let accessTokenUrl = `${ACCESS_TOKEN_URL}/${provider}/access_token`;
    if (url.includes(accessTokenUrl) && !raceCondition) {
      this.setState({ modalVisible: false, raceCondition: true })
      if (isErrorUrl(url)) {
        const err = getErrorFromUrl(url)
        this.close()
        onError(transformError(err))
      } else {
        const { onSuccess } = this.props;
        const data = getTokenFromUrl(url);

        console.log(data);
        const token =  {access_token: data.token, secret: data.secret};
        onSuccess(token);
      }
    }
  }

  getAuthorizationUrl: void => string = () => getAuthorizationUrl({...this.props})

  props: Props

  componentWillUpdate(nextProps, nextState){
    if((nextState.modalVisible !== this.state.modalVisible) && nextState.modalVisible === true){
      this.setState({raceCondition: false})
    }
  }

  close = () => {
    const { onClose } = this.props
    if (onClose) onClose()
    this.setState({ modalVisible: false })
  }

  open = () => {
    const { onOpen } = this.props
    if (onOpen) onOpen()
    this.setState({ modalVisible: true })
  }

  renderButton = () => {
    const { renderButton, linkText } = this.props
    if (renderButton) return renderButton()
    return (
      <Text>
        {linkText}
      </Text>
    )
  }

  renderClose = () => {
    const { renderClose } = this.props
    if (renderClose) return renderClose()
    return (
      // $DisableFlow
      <Image source={require('./assets/x-white.png')} resizeMode="contain" />
    )
  }

  renderWebview = () => {
    const {modalVisible} = this.state
    if(!modalVisible) return null;

    return (
      <WebView
        source={{ uri: this.getAuthorizationUrl() }}
        onLoadStart={this.onLoadStart}
        startInLoadingState
        javaScriptEnabled
        domStorageEnabled
        injectedJavaScript={injectedJavaScript()}
      />
    );
  }

  render() {
    const { modalVisible } = this.state
    const {
      animationType,
      containerStyle,
      wrapperStyle,
      closeStyle,
    } = this.props
    return (
      <View>
        <TouchableOpacity onPress={this.open}>
          {this.renderButton()}
        </TouchableOpacity>
        <Modal animationType={animationType} transparent visible={modalVisible} onRequestClose={this.close}>
          <View style={[styles.constainer, containerStyle]}>
            <View style={[styles.wrapper, wrapperStyle]}>
              {this.renderWebview()}
            </View>
            <TouchableOpacity
              onPress={this.close}
              style={[styles.close, closeStyle]}
            >
              {this.renderClose()}
            </TouchableOpacity>
          </View>
        </Modal>
      </View>
    )
  }
}
