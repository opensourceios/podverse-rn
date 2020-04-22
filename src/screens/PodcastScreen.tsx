import AsyncStorage from '@react-native-community/async-storage'
import debounce from 'lodash/debounce'
import { View as RNView } from 'react-native'
import { NavigationStackOptions } from 'react-navigation-stack'
import React from 'reactn'
import {
  ActionSheet,
  ActivityIndicator,
  ClipTableCell,
  Divider,
  EpisodeTableCell,
  FlatList,
  HTMLScrollView,
  NavSearchIcon,
  NavShareIcon,
  NumberSelectorWithText,
  PodcastTableHeader,
  SearchBar,
  SwipeRowBack,
  SwitchWithText,
  TableSectionHeader,
  TableSectionSelectors,
  Text,
  View
} from '../components'
import { getDownloadedEpisodeLimit, setDownloadedEpisodeLimit } from '../lib/downloadedEpisodeLimiter'
import { getDownloadedEpisodes } from '../lib/downloadedPodcast'
import { downloadEpisode } from '../lib/downloader'
import { alertIfNoNetworkConnection, hasValidNetworkConnection } from '../lib/network'
import { convertNowPlayingItemToEpisode, convertToNowPlayingItem } from '../lib/NowPlayingItem'
import { decodeHTMLString, isOdd, readableDate, removeHTMLFromString, safelyUnwrapNestedVariable } from '../lib/utility'
import { PV } from '../resources'
import { getEpisodes } from '../services/episode'
import { gaTrackPageView } from '../services/googleAnalytics'
import { getMediaRefs } from '../services/mediaRef'
import { getPodcast } from '../services/podcast'
import { removeDownloadedPodcastEpisode, updateAutoDownloadSettings } from '../state/actions/downloads'
import { toggleAddByRSSPodcast } from '../state/actions/parser'
import { toggleSubscribeToPodcast } from '../state/actions/podcast'
import { core } from '../styles'

type Props = {
  navigation?: any
}

type State = {
  downloadedEpisodeLimit?: string | null
  endOfResultsReached: boolean
  flatListData: any[]
  flatListDataTotalCount: number | null
  isLoading: boolean
  isLoadingMore: boolean
  isRefreshing: boolean
  isSearchScreen?: boolean
  isSubscribing: boolean
  limitDownloadedEpisodes: boolean
  podcast?: any
  podcastId?: string
  queryPage: number
  querySort: string | null
  searchBarText: string
  selectedItem?: any
  showActionSheet: boolean
  showNoInternetConnectionMessage?: boolean
  showSettings: boolean
  viewType: string | null
}

export class PodcastScreen extends React.Component<Props, State> {
  static navigationOptions = ({ navigation }) => {
    const podcastId = navigation.getParam('podcastId')
    const podcastTitle = navigation.getParam('podcastTitle')
    const addByRSSPodcastFeedUrl = navigation.getParam('addByRSSPodcastFeedUrl')

    return {
      title: 'Podcast',
      headerRight: (
        <RNView style={core.row}>
          {!addByRSSPodcastFeedUrl && (
            <NavShareIcon
              endingText=' – shared using Podverse'
              podcastTitle={podcastTitle}
              url={PV.URLs.podcast + podcastId}
            />
          )}
          <NavSearchIcon navigation={navigation} />
        </RNView>
      )
    } as NavigationStackOptions
  }

  constructor(props: Props) {
    super(props)

    const podcast = this.props.navigation.getParam('podcast')
    const podcastId =
      (podcast && podcast.id) ||
      (podcast && podcast.addByRSSPodcastFeedUrl) ||
      this.props.navigation.getParam('podcastId')
    const viewType = this.props.navigation.getParam('viewType') || PV.Filters._episodesKey

    if (podcast && (podcast.id || podcast.addByRSSPodcastFeedUrl)) {
      this.props.navigation.setParams({
        podcastId,
        podcastTitle: podcast.title,
        addByRSSPodcastFeedUrl: podcast.addByRSSPodcastFeedUrl
      })
    }

    this.state = {
      downloadedEpisodeLimit: null,
      endOfResultsReached: false,
      flatListData: [],
      flatListDataTotalCount: null,
      isLoading: viewType !== PV.Filters._downloadedKey || !podcast,
      isLoadingMore: false,
      isRefreshing: false,
      isSubscribing: false,
      limitDownloadedEpisodes: false,
      podcast,
      podcastId,
      queryPage: 1,
      querySort: PV.Filters._mostRecentKey,
      searchBarText: '',
      showActionSheet: false,
      showSettings: false,
      viewType
    }

    this._handleSearchBarTextQuery = debounce(this._handleSearchBarTextQuery, PV.SearchBar.textInputDebounceTime)
  }

  async componentDidMount() {
    const { navigation } = this.props
    const { podcast, podcastId } = this.state
    const episodeId = navigation.getParam('navToEpisodeWithId')

    const hasInternetConnection = await hasValidNetworkConnection()

    this.setState(
      {
        ...(!hasInternetConnection
          ? {
              viewType: PV.Filters._downloadedKey
            }
          : { viewType: this.state.viewType })
      },
      () => {
        this._initializePageData()
        if (episodeId) {
          navigation.navigate(PV.RouteNames.EpisodeScreen, { episodeId })
        }
      }
    )
    const pageTitle = podcast ? 'Podcasts Screen - ' + podcast.title : 'PodcastsScreen - ' + 'no info available'
    gaTrackPageView('/podcast/' + podcastId, pageTitle)
  }

  async _initializePageData() {
    const { podcast, viewType } = this.state
    const podcastId = this.props.navigation.getParam('podcastId') || this.state.podcastId
    const downloadedEpisodeLimit = await getDownloadedEpisodeLimit(podcastId)

    this.setState(
      {
        downloadedEpisodeLimit,
        endOfResultsReached: false,
        flatListData: [],
        flatListDataTotalCount: null,
        isLoading: true,
        limitDownloadedEpisodes: downloadedEpisodeLimit && downloadedEpisodeLimit > 0,
        podcastId,
        queryPage: 1
      },
      async () => {
        let newState = {}
        let newPodcast: any

        try {
          if (podcast && podcast.addByRSSPodcastFeedUrl) {
            newPodcast = podcast
            newState.flatListData = podcast.episodes || []
            newState.flatListDataTotalCount = newState.flatListData.length
          } else {
            newPodcast = await getPodcast(podcastId)
            if (viewType === PV.Filters._episodesKey) {
              newState = await this._queryData(PV.Filters._episodesKey)
            } else if (viewType === PV.Filters._clipsKey) {
              newState = await this._queryData(PV.Filters._clipsKey)
            }
          }

          newPodcast.description = newPodcast.description || 'No summary available.'

          this.setState({
            ...newState,
            isLoading: false,
            podcast: newPodcast
          })
        } catch (error) {
          console.log('_initializePageData', error)
          this.setState({
            ...newState,
            isLoading: false,
            ...(newPodcast ? { podcast: newPodcast } : { podcast })
          })
        }
      }
    )
  }

  selectLeftItem = async (selectedKey: string) => {
    if (!selectedKey) {
      this.setState({ viewType: null })
      return
    }

    this.setState(
      {
        endOfResultsReached: false,
        flatListData: [],
        flatListDataTotalCount: null,
        isLoading: true,
        queryPage: 1,
        searchBarText: '',
        viewType: selectedKey
      },
      async () => {
        const newState = await this._queryData(selectedKey)
        this.setState(newState)
      }
    )
  }

  selectRightItem = async (selectedKey: string) => {
    if (!selectedKey) {
      this.setState({ querySort: null })
      return
    }

    this.setState(
      {
        endOfResultsReached: false,
        flatListData: [],
        flatListDataTotalCount: null,
        isLoading: true,
        queryPage: 1,
        querySort: selectedKey
      },
      async () => {
        const newState = await this._queryData(selectedKey)
        this.setState(newState)
      }
    )
  }

  _onEndReached = ({ distanceFromEnd }) => {
    const { endOfResultsReached, isLoadingMore, podcast, queryPage = 1, viewType } = this.state

    if (
      !podcast.addByRSSPodcastFeedUrl &&
      viewType !== PV.Filters._downloadedKey &&
      !endOfResultsReached &&
      !isLoadingMore
    ) {
      if (distanceFromEnd > -1) {
        this.setState(
          {
            isLoadingMore: true
          },
          async () => {
            const newState = await this._queryData(viewType, {
              queryPage: queryPage + 1,
              searchAllFieldsText: this.state.searchBarText
            })
            this.setState(newState)
          }
        )
      }
    }
  }

  _onRefresh = () => {
    const { viewType } = this.state

    this.setState(
      {
        isRefreshing: true
      },
      async () => {
        const newState = await this._queryData(viewType, { queryPage: 1 })
        this.setState(newState)
      }
    )
  }

  _ListHeaderComponent = () => {
    const { searchBarText } = this.state

    return (
      <View style={styles.ListHeaderComponent}>
        <SearchBar
          inputContainerStyle={core.searchBar}
          onChangeText={this._handleSearchBarTextChange}
          onClear={this._handleSearchBarClear}
          value={searchBarText}
        />
      </View>
    )
  }

  _ItemSeparatorComponent = () => {
    return <Divider />
  }

  _handleCancelPress = () => {
    return new Promise((resolve, reject) => {
      this.setState({ showActionSheet: false }, resolve)
    })
  }

  _handleMorePress = (selectedItem: any) => {
    this.setState({
      selectedItem,
      showActionSheet: true
    })
  }

  _renderItem = ({ item, index }) => {
    const { podcast, viewType } = this.state
    const episode = {
      ...item,
      podcast
    }

    const isSearchScreen = this.props.navigation.getParam('isSearchScreen')
    const screen = isSearchScreen ? PV.RouteNames.SearchEpisodeScreen : PV.RouteNames.EpisodeScreen

    if (viewType === PV.Filters._downloadedKey) {
      let description = removeHTMLFromString(item.description)
      description = decodeHTMLString(description)
      return (
        <EpisodeTableCell
          description={description}
          handleMorePress={() => this._handleMorePress(convertToNowPlayingItem(item, null, podcast))}
          handleNavigationPress={() =>
            this.props.navigation.navigate(screen, {
              episode,
              addByRSSPodcastFeedUrl: podcast.addByRSSPodcastFeedUrl
            })
          }
          hasZebraStripe={isOdd(index)}
          hideImage={true}
          id={item.id}
          pubDate={item.pubDate}
          title={item.title}
        />
      )
    } else if (viewType === PV.Filters._episodesKey) {
      let description = removeHTMLFromString(item.description)
      description = decodeHTMLString(description)
      return (
        <EpisodeTableCell
          description={description}
          handleMorePress={() => this._handleMorePress(convertToNowPlayingItem(item, null, podcast))}
          handleNavigationPress={() =>
            this.props.navigation.navigate(screen, {
              episode,
              addByRSSPodcastFeedUrl: podcast.addByRSSPodcastFeedUrl
            })
          }
          hasZebraStripe={isOdd(index)}
          hideImage={true}
          id={item.id}
          pubDate={item.pubDate}
          title={item.title}
        />
      )
    } else {
      return item && item.episode && item.episode.id ? (
        <ClipTableCell
          endTime={item.endTime}
          episodeId={item.episode.id}
          episodePubDate={readableDate(item.episode.pubDate)}
          episodeTitle={item.episode.title}
          handleMorePress={() => this._handleMorePress(convertToNowPlayingItem(item, null, podcast))}
          hasZebraStripe={isOdd(index)}
          hideImage={true}
          startTime={item.startTime}
          title={item.title}
        />
      ) : (
        <></>
      )
    }
  }

  _renderHiddenItem = ({ item }, rowMap) => (
    <SwipeRowBack onPress={() => this._handleHiddenItemPress(item.id, rowMap)} text='Delete' />
  )

  _handleHiddenItemPress = async (selectedId, rowMap) => {
    const filteredEpisodes = this.state.flatListData.filter((x: any) => x.id !== selectedId)
    this.setState(
      {
        flatListData: filteredEpisodes
      },
      async () => {
        await removeDownloadedPodcastEpisode(selectedId)
        const finalDownloadedEpisodes = await getDownloadedEpisodes()
        this.setState({ flatListData: finalDownloadedEpisodes })
      }
    )
  }

  _handleSearchBarTextChange = (text: string) => {
    const { viewType } = this.state

    this.setState(
      {
        isLoadingMore: true,
        searchBarText: text
      },
      async () => {
        this._handleSearchBarTextQuery(viewType, { searchAllFieldsText: text })
      }
    )
  }

  _handleSearchBarTextQuery = async (viewType: string | null, queryOptions: any) => {
    this.setState(
      {
        flatListData: [],
        flatListDataTotalCount: null,
        queryPage: 1
      },
      async () => {
        const state = await this._queryData(viewType, {
          searchAllFieldsText: queryOptions.searchAllFieldsText
        })
        this.setState(state)
      }
    )
  }

  _handleSearchBarClear = (text: string) => {
    this.setState({ searchBarText: '' })
  }

  _toggleSubscribeToPodcast = async () => {
    const { podcast, podcastId } = this.state
    const { addByRSSPodcastFeedUrl } = podcast

    if (podcastId) {
      const wasAlerted = await alertIfNoNetworkConnection('subscribe to podcast')
      if (wasAlerted) return

      this.setState({ isSubscribing: true }, async () => {
        try {
          if (addByRSSPodcastFeedUrl) {
            await toggleAddByRSSPodcast(podcastId)
          } else {
            await toggleSubscribeToPodcast(podcastId)
          }
          this.setState({ isSubscribing: false })
        } catch (error) {
          this.setState({ isSubscribing: false })
        }

        const downloadedEpisodeLimit = await getDownloadedEpisodeLimit(podcastId)

        this.setState({
          downloadedEpisodeLimit,
          limitDownloadedEpisodes: downloadedEpisodeLimit && downloadedEpisodeLimit > 0
        })
      })
    }
  }

  _handleDownloadPressed = () => {
    if (this.state.selectedItem) {
      const episode = convertNowPlayingItemToEpisode(this.state.selectedItem)
      downloadEpisode(episode, episode.podcast)
    }
  }

  _handleToggleAutoDownload = (autoDownloadOn: boolean) => {
    const { podcast, podcastId } = this.state
    const id = (podcast && podcast.id) || podcastId
    if (id) updateAutoDownloadSettings(id, autoDownloadOn)
  }

  _handleToggleSettings = () => {
    this.setState({ showSettings: !this.state.showSettings })
  }

  _handleToggleLimitDownloads = async () => {
    const { podcastId } = this.state
    if (podcastId) {
      const shouldLimitDownloads = !this.state.limitDownloadedEpisodes
      const globalDownloadedEpisodeLimitCount = (await AsyncStorage.getItem(
        PV.Keys.DOWNLOADED_EPISODE_LIMIT_GLOBAL_COUNT
      )) as any
      setDownloadedEpisodeLimit(podcastId, shouldLimitDownloads ? globalDownloadedEpisodeLimitCount : null)
      this.setState({
        downloadedEpisodeLimit: shouldLimitDownloads ? globalDownloadedEpisodeLimitCount : null,
        limitDownloadedEpisodes: shouldLimitDownloads
      })
    }
  }

  _handleChangeDownloadLimitText = (value: string) => {
    const { podcast } = this.state
    this.setState({ downloadedEpisodeLimit: value })
    const int = parseInt(value, 10)
    if (int) setDownloadedEpisodeLimit(podcast.id, int)
  }

  render() {
    const { navigation } = this.props

    const {
      downloadedEpisodeLimit,
      isLoading,
      isLoadingMore,
      isRefreshing,
      isSubscribing,
      limitDownloadedEpisodes,
      podcast,
      podcastId,
      querySort,
      selectedItem,
      showActionSheet,
      showNoInternetConnectionMessage,
      showSettings,
      viewType
    } = this.state
    const subscribedPodcastIds = safelyUnwrapNestedVariable(() => this.global.session.userInfo.subscribedPodcastIds, [])

    let isSubscribed = subscribedPodcastIds.some((x: string) => x === podcastId)
    if (!isSubscribed) {
      const subscribedPodcasts = safelyUnwrapNestedVariable(() => this.global.subscribedPodcasts, [])
      isSubscribed = subscribedPodcasts.some(
        (x: any) => x.addByRSSPodcastFeedUrl && x.addByRSSPodcastFeedUrl === podcastId
      )
    }

    let { flatListData, flatListDataTotalCount } = this.state
    const { autoDownloadSettings } = this.global
    const autoDownloadOn =
      (podcast && autoDownloadSettings[podcast.id]) || (podcastId && autoDownloadSettings[podcastId])

    let items = PV.FilterOptions.screenFilters.PodcastScreen.sort
    if (viewType === PV.Filters._downloadedKey) {
      const { downloadedPodcasts } = this.global
      const downloadedPodcast = downloadedPodcasts.find(
        (x: any) => (podcast && x.id === podcast.id) || x.id === podcastId
      )
      flatListData = (downloadedPodcast && downloadedPodcast.episodes) || []
      flatListDataTotalCount = flatListData.length
    } else if (!viewType || viewType === PV.Filters._aboutKey) {
      items = []
    }

    const resultsText =
      (viewType === PV.Filters._downloadedKey && 'episodes') ||
      (viewType === PV.Filters._episodesKey && 'episodes') ||
      (viewType === PV.Filters._clipsKey && 'clips') ||
      'results'

    return (
      <View style={styles.view}>
        <PodcastTableHeader
          autoDownloadOn={autoDownloadOn}
          handleToggleAutoDownload={this._handleToggleAutoDownload}
          handleToggleSettings={this._handleToggleSettings}
          handleToggleSubscribe={this._toggleSubscribeToPodcast}
          isLoading={isLoading && !podcast}
          isNotFound={!isLoading && !podcast}
          isSubscribed={isSubscribed}
          isSubscribing={isSubscribing}
          podcastImageUrl={podcast && (podcast.shrunkImageUrl || podcast.imageUrl)}
          podcastTitle={podcast && podcast.title}
          showSettings={showSettings}
        />
        {!showSettings && (
          <TableSectionSelectors
            handleSelectLeftItem={this.selectLeftItem}
            handleSelectRightItem={this.selectRightItem}
            screenName='PodcastScreen'
            selectedLeftItemKey={viewType}
            selectedRightItemKey={querySort}
          />
        )}
        {showSettings && <TableSectionHeader title='Settings' />}
        {showSettings && (
          <View style={styles.settingsView}>
            <SwitchWithText
              onValueChange={this._handleToggleLimitDownloads}
              text={limitDownloadedEpisodes ? 'Download limit on' : 'Download limit off'}
              value={limitDownloadedEpisodes}
            />
            <NumberSelectorWithText
              handleChangeText={this._handleChangeDownloadLimitText}
              selectedNumber={downloadedEpisodeLimit}
              text='Download limit max'
            />
            <Text fontSizeLargestScale={PV.Fonts.largeSizes.sm} style={styles.settingsHelpText}>
              Once the download limit is exceeded, the oldest episode will be auto deleted.
            </Text>
          </View>
        )}
        {!showSettings && (
          <View style={styles.view}>
            {isLoading && <ActivityIndicator />}
            {!isLoading && viewType !== PV.Filters._aboutKey && flatListData && podcast && (
              <FlatList
                data={flatListData}
                dataTotalCount={flatListDataTotalCount}
                disableLeftSwipe={viewType !== PV.Filters._downloadedKey}
                extraData={flatListData}
                isLoadingMore={isLoadingMore}
                isRefreshing={isRefreshing}
                ItemSeparatorComponent={this._ItemSeparatorComponent}
                keyExtractor={(item: any) => item.id}
                ListHeaderComponent={
                  viewType === PV.Filters._episodesKey || viewType === PV.Filters._clipsKey
                    ? this._ListHeaderComponent
                    : null
                }
                onEndReached={this._onEndReached}
                renderHiddenItem={this._renderHiddenItem}
                renderItem={this._renderItem}
                resultsText={resultsText}
                showNoInternetConnectionMessage={showNoInternetConnectionMessage}
              />
            )}
            {!isLoading && viewType === PV.Filters._aboutKey && podcast && (
              <HTMLScrollView
                fontSizeLargestScale={PV.Fonts.largeSizes.md}
                html={podcast.description || (showNoInternetConnectionMessage ? 'No internet connection' : '')}
                navigation={navigation}
              />
            )}
            <ActionSheet
              handleCancelPress={this._handleCancelPress}
              items={() =>
                PV.ActionSheet.media.moreButtons(
                  selectedItem,
                  navigation,
                  this._handleCancelPress,
                  this._handleDownloadPressed
                )
              }
              showModal={showActionSheet}
            />
          </View>
        )}
      </View>
    )
  }

  _queryEpisodes = async (sort: string | null, page: number = 1) => {
    const { podcastId, searchBarText: searchAllFieldsText } = this.state
    const results = await getEpisodes(
      {
        sort,
        page,
        podcastId,
        ...(searchAllFieldsText ? { searchAllFieldsText } : {})
      },
      this.global.settings.nsfwMode
    )

    return results
  }

  _queryClips = async (sort: string | null, page: number = 1) => {
    const { podcastId, searchBarText: searchAllFieldsText } = this.state
    const results = await getMediaRefs(
      {
        sort,
        page,
        podcastId,
        includeEpisode: true,
        ...(searchAllFieldsText ? { searchAllFieldsText } : {})
      },
      this.global.settings.nsfwMode
    )
    return results
  }

  _queryData = async (
    filterKey: string | null,
    queryOptions: { queryPage?: number; searchAllFieldsText?: string } = {}
  ) => {
    const { flatListData, podcastId, querySort, viewType } = this.state
    const newState = {
      isLoading: false,
      isLoadingMore: false,
      isRefreshing: false,
      showNoInternetConnectionMessage: false
    } as State

    const hasInternetConnection = await hasValidNetworkConnection()
    newState.showNoInternetConnectionMessage = !hasInternetConnection && filterKey !== PV.Filters._downloadedKey

    try {
      if (filterKey === PV.Filters._episodesKey) {
        const results = await this._queryEpisodes(querySort, queryOptions.queryPage)
        newState.flatListData = [...flatListData, ...results[0]]
        newState.endOfResultsReached = newState.flatListData.length >= results[1]
        newState.flatListDataTotalCount = results[1]
      } else if (filterKey === PV.Filters._clipsKey) {
        const results = await this._queryClips(querySort, queryOptions.queryPage)
        newState.flatListData = [...flatListData, ...results[0]]
        newState.endOfResultsReached = newState.flatListData.length >= results[1]
        newState.flatListDataTotalCount = results[1]
      } else if (PV.FilterOptions.screenFilters.PodcastScreen.sort.some((option) => option === filterKey)) {
        let results = []

        if (viewType === PV.Filters._episodesKey) {
          results = await this._queryEpisodes(querySort)
        } else if (viewType === PV.Filters._clipsKey) {
          results = await this._queryClips(querySort)
        }

        newState.flatListData = [...flatListData, ...results[0]]
        newState.endOfResultsReached = newState.flatListData.length >= results[1]
        newState.flatListDataTotalCount = results[1]
      } else if (filterKey === PV.Filters._aboutKey) {
        if (podcastId && hasInternetConnection) {
          const newPodcast = await getPodcast(podcastId)
          newState.podcast = newPodcast
        }
      }
      newState.queryPage = queryOptions.queryPage || 1
      return newState
    } catch (error) {
      console.log(error)
      return newState
    }
  }
}

const styles = {
  aboutView: {
    margin: 8
  },
  aboutViewText: {
    fontSize: PV.Fonts.sizes.lg
  },
  settingsHelpText: {
    fontSize: PV.Fonts.sizes.md
  },
  settingsView: {
    flex: 1,
    padding: 8
  },
  swipeRowBack: {
    marginBottom: 8,
    marginTop: 8
  },
  view: {
    flex: 1
  }
}
