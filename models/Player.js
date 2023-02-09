/**
 * 用户数据文件
 */
import lodash from 'lodash'
import Base from './Base.js'
import { Data } from '../components/index.js'
import { AvatarData } from './index.js'

import MysAvatar from './player-lib/MysAvatar.js'
import Profile from './player-lib/Profile.js'

Data.createDir('/data/userData', 'root')

export default class Player extends Base {
  constructor (uid) {
    super()
    uid = uid?._mys?.uid || uid?.uid || uid
    if (!uid) {
      return false
    }
    let cacheObj = this._getCache(`player:${uid}`)
    if (cacheObj) {
      return cacheObj
    }
    this.uid = uid
    this.reload()
    return this._cache()
  }

  static create (e) {
    if (e?._mys?.uid || e.uid) {
      // 传入为e
      let player = new Player(e?._mys?.uid || e.uid)
      player.e = e
      return player
    } else {
      return new Player(e)
    }
  }

  /**
   * 重新加载json文件
   */
  reload () {
    let data
    data = Data.readJSON(`/data/UserData/${this.uid}.json`, 'root')
    this.setBasicData(data)
    if (data.chars) {
      this.setAvatars(data.chars)
      // 暂时保留旧数据，防止异常情况
      this._chars = data.chars
    }
    this.setAvatars(data.avatars || [])
  }

  /**
   * 保存json文件
   */
  save () {
    let ret = Data.getData(this, 'uid,name,level,word,face,card,sign,_mys,_profile')
    ret.avatars = {}
    lodash.forEach(this._avatars, (ds) => {
      ret.avatars[ds.id] = ds.toJSON()
    })
    // 暂时保留旧数据，防止异常情况
    if (this._chars) {
      ret.chars = this._chars
    }
    Data.writeJSON(`/data/UserData/${this.uid}.json`, ret, '', 'root')
  }

  /**
   * 设置玩家基础数据
   * @param ds
   */
  setBasicData (ds) {
    this.name = ds.name || this.name || ''
    this.level = ds.level || this.level || 1
    this.word = ds.word || this.word || 1
    this.face = ds.face || this.face || ''
    this.card = ds.card || this.card || ''
    this.sign = ds.sign || this.sign || ''
    this._avatars = this._avatars || {}
    this._profile = ds._profile || this._profile
    this._mys = ds._mys || this._mys
  }

  // 设置角色列表
  setAvatars (ds) {
    lodash.forEach(ds, (avatar) => {
      this.setAvatar(avatar)
    })
  }

  // 设置角色数据
  setAvatar (ds, source = '') {
    let avatar = this.getAvatar(ds.id)
    avatar.setAvatar(ds, source)
  }

  // 获取Avatar角色
  getAvatar (id) {
    if (!this._avatars[id]) {
      this._avatars[id] = AvatarData.create({ id })
    }
    return this._avatars[id]
  }

  // 异步循环角色
  async forEachAvatarAsync (fn) {
    for (let id in this._avatars) {
      let ret = await fn(this._avatars[id], id)
      if (ret === false) {
        return false
      }
    }
  }

  // 循环Avatar
  forEachAvatar (fn) {
    for (let id in this._avatars) {
      let ret = fn(this._avatars[id], id)
      if (ret === false) {
        return false
      }
    }
  }

  // 获取所有Avatar数据
  getAvatarData (ids = '') {
    let ret = {}
    if (!ids) {
      this.forEachAvatar((avatar) => {
        ret[avatar.id] = avatar.getDetail()
      })
    } else {
      lodash.forEach(ids, (id) => {
        ret[id] = this.getAvatar(id)
      })
    }
    return ret
  }

  // 获取指定角色的面板数据
  getProfile (id) {
    let avatar = this.getAvatar(id)
    return avatar.getProfile()
  }

  // 获取所有面板数据
  getProfiles () {
    let ret = {}
    lodash.forEach(this._avatars, (avatar) => {
      let profile = avatar.getProfile()
      if (profile) {
        ret[profile.id] = profile
      }
    })
    return ret
  }

  // 更新面板
  async refreshProfile (force = true) {
    return await Profile.refreshProfile(this, force)
  }

  // 更新米游社数据
  async refreshMys (force = false) {
    return MysAvatar.refreshMys(this, force)
  }

  // 通过已有的Mys CharData更新
  setMysCharData (charData) {
    MysAvatar.setMysCharData(this, charData)
  }

  // 使用MysApi刷新指定角色的天赋信息
  async refreshTalent (ids = '', force = false) {
    return await MysAvatar.refreshTalent(this, ids, force)
  }

  // 获取面板更新服务名
  static getProfileServName (uid) {
    let Serv = Profile.getServ(uid)
    return Serv.name
  }
}
