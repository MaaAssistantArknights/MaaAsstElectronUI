import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import _ from 'lodash'
import logger from '@main/utils/logger'

type StorageOption<T> = Partial<{
  defaults: T
  cwd: string
  ext: string
  name: string
  serialize: (value: T) => string
  deserialize: (raw: string) => T
}>

const convertExt = (str?: string): string | undefined => (/\.\w+/.test(str ?? '') ? str : undefined)

class Storage<T extends Object> {
  constructor (option?: StorageOption<T>) {
    this.m_storage = option?.defaults ?? Object.create({})
    this.m_cwd = option?.cwd ?? app.getPath('userData')
    this.m_ext = convertExt(option?.ext) ?? '.json'
    this.m_name = option?.name ?? 'config'
    this.m_serialize =
      option?.serialize ?? ((value: T) => JSON.stringify(value, null, '  '))
    this.m_deserialize = option?.deserialize ?? JSON.parse

    if (!fs.existsSync(this.m_cwd)) {
      fs.mkdirSync(this.m_cwd)
    }

    if (!fs.existsSync(this.filepath)) {
      fs.writeFileSync(this.filepath, '{}')
    } else {
      this.readFromFile()
    }
  }

  get (key: string): any {
    return _.get(this.m_storage, key)
  }

  set (key: string, value: any): void {
    _.set(this.m_storage, key, value)
    this.saveToFile()
  }

  has (key: string): boolean {
    return _.has(this.m_storage, key)
  }

  public get filepath (): string {
    return path.join(this.m_cwd, this.m_name + this.m_ext)
  }

  private readonly saveToFile = _.debounce(() => {
    fs.writeFileSync(this.filepath, this.m_serialize(this.m_storage))
    logger.debug('configuration saved')
  }, 200);

  private readonly readFromFile = () => {
    fs.readFile(this.filepath, (error, data) => {
      if (error != null) {
        logger.error('error while read config file:', this.filepath, error)
      } else {
        this.m_storage = this.m_deserialize(data.toString())
      }
    })
  };

  private readonly m_cwd: string;
  private readonly m_name: string;
  private readonly m_ext: string;
  private readonly m_serialize;
  private readonly m_deserialize;
  private m_storage: T
}

export default Storage
