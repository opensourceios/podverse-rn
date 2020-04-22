import AsyncStorage from '@react-native-community/async-storage'
import { NowPlayingItem } from '../lib/NowPlayingItem'
import { checkIfIdMatchesClipIdOrEpisodeId } from '../lib/utility'
import { PV } from '../resources'
import { checkIfShouldUseServerData, getAuthenticatedUserInfo } from './auth'
import { PVTrackPlayer, syncPlayerWithQueue } from './player'
import { updateUserQueueItems } from './user'

export const addQueueItemLast = async (item: NowPlayingItem) => {
  let results = []
  const useServerData = await checkIfShouldUseServerData()

  if (useServerData) {
    results = await addQueueItemLastOnServer(item)
  } else {
    results = await addQueueItemLastLocally(item)
  }

  await syncPlayerWithQueue()

  return results
}

export const addQueueItemNext = async (item: NowPlayingItem) => {
  let results = []

  const currentTrackId = await PVTrackPlayer.getCurrentTrack()
  // Don't add track to queue if it's currently playing
  if (checkIfIdMatchesClipIdOrEpisodeId(currentTrackId, item.clipId, item.episodeId)) {
    return
  }

  const useServerData = await checkIfShouldUseServerData()

  if (useServerData) {
    results = await addQueueItemNextOnServer(item)
  } else {
    results = await addQueueItemNextLocally(item)
  }

  await syncPlayerWithQueue()

  return results
}

export const getQueueItems = async () => {
  const useServerData = await checkIfShouldUseServerData()
  return useServerData ? getQueueItemsFromServer() : getQueueItemsLocally()
}

export const getNextFromQueue = async () => {
  const useServerData = await checkIfShouldUseServerData()
  const item = await getNextFromQueueLocally()
  if (useServerData) getNextFromQueueFromServer()

  if (item) {
    removeQueueItem(item)
  }

  return item
}

export const removeQueueItem = async (item: NowPlayingItem) => {
  let items = []
  const useServerData = await checkIfShouldUseServerData()

  if (useServerData) {
    items = await removeQueueItemOnServer(item)
  } else {
    items = await removeQueueItemLocally(item)
  }

  await syncPlayerWithQueue()

  return items
}

export const setAllQueueItems = async (items: NowPlayingItem[]) => {
  const useServerData = await checkIfShouldUseServerData()

  await setAllQueueItemsLocally(items)
  if (useServerData) await setAllQueueItemsOnServer(items)

  await syncPlayerWithQueue()

  return items
}

const addQueueItemLastLocally = async (item: NowPlayingItem) => {
  const items = await getQueueItemsLocally()
  const filteredItems = filterItemFromQueueItems(items, item)
  filteredItems.push(item)
  return setAllQueueItemsLocally(filteredItems)
}

const addQueueItemLastOnServer = async (item: NowPlayingItem) => {
  const items = await getQueueItemsFromServer()
  const filteredItems = filterItemFromQueueItems(items, item)
  filteredItems.push(item)
  await setAllQueueItemsLocally(filteredItems)
  return setAllQueueItemsOnServer(filteredItems)
}

const addQueueItemNextLocally = async (item: NowPlayingItem) => {
  const items = await getQueueItemsLocally()
  const filteredItems = filterItemFromQueueItems(items, item)
  filteredItems.unshift(item)
  return setAllQueueItemsLocally(filteredItems)
}

const addQueueItemNextOnServer = async (item: NowPlayingItem) => {
  const items = await getQueueItemsFromServer()
  const filteredItems = filterItemFromQueueItems(items, item)
  filteredItems.unshift(item)
  await setAllQueueItemsLocally(filteredItems)
  return setAllQueueItemsOnServer(filteredItems)
}

export const filterItemFromQueueItems = (items: NowPlayingItem[] = [], item: NowPlayingItem) => {
  let itemsArray = Array.isArray(items) ? items : []
  itemsArray = itemsArray.filter((x) => {
    if (item.clipId && x.clipId === item.clipId) {
      return false
    } else if (!item.clipId && !x.clipId && x.episodeId === item.episodeId) {
      return false
    }
    return true
  })

  return itemsArray
}

const getNextFromQueueLocally = async () => {
  const items = await getQueueItemsLocally()
  const item = items.shift()
  return item
}

const getNextFromQueueFromServer = async () => {
  const items = await getQueueItemsFromServer()
  const item = items.shift()
  return item
}

export const getQueueItemsLocally = async () => {
  try {
    const itemsString = await AsyncStorage.getItem(PV.Keys.QUEUE_ITEMS)
    return itemsString ? JSON.parse(itemsString) : []
  } catch (error) {
    return []
  }
}

const getQueueItemsFromServer = async () => {
  const response = await getAuthenticatedUserInfo()
  const user = response[0]
  const { queueItems = [] } = user
  await setAllQueueItemsLocally(queueItems)
  return queueItems
}

const removeQueueItemLocally = async (item: NowPlayingItem) => {
  const items = await getQueueItemsLocally()
  const filteredItems = filterItemFromQueueItems(items, item)
  return setAllQueueItemsLocally(filteredItems)
}

const removeQueueItemOnServer = async (item: NowPlayingItem) => {
  await removeQueueItemLocally(item)
  const items = await getQueueItemsFromServer()
  const filteredItems = filterItemFromQueueItems(items, item)
  return setAllQueueItemsOnServer(filteredItems)
}

const setAllQueueItemsLocally = async (items: NowPlayingItem[]) => {
  if (Array.isArray(items)) {
    await AsyncStorage.setItem(PV.Keys.QUEUE_ITEMS, JSON.stringify(items))
  }
  return items
}

const setAllQueueItemsOnServer = async (items: NowPlayingItem[]) => {
  await setAllQueueItemsLocally(items)
  return updateUserQueueItems(items)
}
