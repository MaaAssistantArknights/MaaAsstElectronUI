import { Singleton } from '@main/../common/function/singletonDecorator'
import Storage from '@main/storageManager'
import path from 'path'
import { app } from 'electron'
import _ from 'lodash'
import logger from '@main/utils/logger'
import { existsSync, mkdirSync } from 'fs'
import ffi, { DynamicLibrary } from 'ffi-napi'
import ref from 'ref-napi'
import callbackHandle from './callback'

const storage = new Storage()

/** Some types for core */
const BoolType = ref.types.bool
const IntType = ref.types.int
// const IntArrayType = ArrayType(IntType)
// const DoubleType = ref.types.double
const ULLType = ref.types.ulonglong
const voidType = ref.types.void
const StringType = ref.types.CString
// const StringPtrType = ref.refType(StringType)
// const StringPtrArrayType = ArrayType(StringType)
const AsstType = ref.types.void
const AsstPtrType = ref.refType(AsstType)
// const TaskPtrType = ref.refType(AsstType)
const CustomArgsType = ref.refType(ref.types.void)
/**
const CallBackType = ffi.Function(ref.types.void, [
  IntType,
  StringType,
  ref.refType(ref.types.void)
])
 */
const Buff = CustomArgsType
type AsstInstancePtr = ref.Pointer<void>
// type TaskInstancePtr = ref.Pointer<void>

// type CallBackFunc = (msg: number, detail: string, custom?: any) => any

function createVoidPointer (): ref.Value<void> {
  return ref.alloc(ref.types.void)
}
@Singleton
class CoreLoader {
  private readonly dependences: Record<string, string[]> = {
    win32: [
      'libiomp5md',
      'mklml',
      'mkldnn',
      'opencv_world453',
      'paddle_inference',
      'ppocr'
      // 'penguin-stats-recognize'
    ],
    linux: [],
    darwin: ['libpaddle_inference.dylib']
  }

  private readonly libName: Record<string, string> = {
    win32: 'MeoAssistant',
    darwin: 'MeoAssistant.dylib',
    linux: 'libMeoAssistant.so'
  }

  private DLib!: ffi.DynamicLibrary;
  private static libPath: string
  private static readonly libPathKey = 'libPath';
  private static readonly defaultLibPath = path.join(app.getPath('appData'), app.getName(), 'core');
  private static loadStatus: boolean // core????????????
  public MeoAsstLib!: any;
  private readonly DepLibs: DynamicLibrary[] = [];
  MeoAsstPtr: Record<string, AsstInstancePtr> = {};

  constructor () {
    // ????????????????????????core???????????????
    CoreLoader.loadStatus = false
    CoreLoader.libPath = storage.get(CoreLoader.libPathKey) as string
    if (!_.isString(CoreLoader.libPath) || !existsSync(CoreLoader.libPath)) {
      logger.error(`Update resource folder: ${CoreLoader.libPath} --> ${CoreLoader.defaultLibPath}`)
      CoreLoader.libPath = CoreLoader.defaultLibPath
      if (!existsSync(CoreLoader.libPath)) mkdirSync(CoreLoader.libPath)
    }
    if (path.isAbsolute(CoreLoader.libPath)) {
      CoreLoader.libPath = path.resolve(CoreLoader.libPath)
      storage.set(CoreLoader.libPathKey, CoreLoader.libPath)
    }
  }

  /**
   * @description ???????????????
   */
  public get name (): string {
    return 'CoreLoader'
  }

  /**
   * @description ??????????????????
   */
  public get version (): string {
    return '1.0.0'
  }

  public get loadStatus (): boolean {
    return CoreLoader.loadStatus
  }

  /**
   * @description ??????core????????????
   */
  public get libPath (): string {
    return CoreLoader.libPath
  }

  /**
   * ??????core
   */
  public load (): void {
    if (CoreLoader.loadStatus) {
      logger.debug('core already loaded, ignore..')
      return
    }
    try {
      this.dependences[process.platform].forEach((lib) => {
        this.DepLibs.push(ffi.DynamicLibrary(path.join(this.libPath, lib)))
      })
      this.DLib = ffi.DynamicLibrary(path.join(this.libPath, this.libName[process.platform]), ffi.RTLD_NOW)
      this.MeoAsstLib =
      {
        AsstLoadResource: ffi.ForeignFunction(this.DLib.get('AsstLoadResource'), BoolType,
          [StringType], ffi.FFI_STDCALL),
        AsstCreate: ffi.ForeignFunction(this.DLib.get('AsstCreate'), AsstPtrType, [], ffi.FFI_STDCALL),
        AsstCreateEx: ffi.ForeignFunction(this.DLib.get('AsstCreateEx'), AsstPtrType,
          ['pointer', CustomArgsType], ffi.FFI_STDCALL),
        AsstDestroy: ffi.ForeignFunction(this.DLib.get('AsstDestroy'), voidType, [AsstPtrType], ffi.FFI_STDCALL),
        AsstConnect: ffi.ForeignFunction(this.DLib.get('AsstConnect'),
          BoolType,
          [AsstPtrType, StringType, StringType, StringType],
          ffi.FFI_STDCALL),

        AsstAppendTask: ffi.ForeignFunction(this.DLib.get('AsstAppendTask'), IntType,
          [AsstPtrType, StringType, StringType], ffi.FFI_STDCALL),
        AsstSetTaskParams: ffi.ForeignFunction(this.DLib.get('AsstSetTaskParams'), BoolType,
          [AsstPtrType, IntType, StringType], ffi.FFI_STDCALL),

        AsstStart: ffi.ForeignFunction(this.DLib.get('AsstStart'), BoolType,
          [AsstPtrType], ffi.FFI_STDCALL),
        AsstStop: ffi.ForeignFunction(this.DLib.get('AsstStop'), BoolType,
          [AsstPtrType], ffi.FFI_STDCALL),

        AsstGetImage: ffi.ForeignFunction(this.DLib.get('AsstGetImage'), ULLType,
          [AsstPtrType, Buff, ULLType], ffi.FFI_STDCALL),
        AsstCtrlerClick: ffi.ForeignFunction(this.DLib.get('AsstCtrlerClick'), BoolType,
          [AsstPtrType, IntType, IntType, BoolType], ffi.FFI_STDCALL),
        AsstGetVersion: ffi.ForeignFunction(this.DLib.get('AsstGetVersion'), StringType,
          [], ffi.FFI_STDCALL),
        AsstLog: ffi.ForeignFunction(this.DLib.get('AsstLog'), voidType,
          [StringType, StringType], ffi.FFI_STDCALL)
      }
      this.LoadResource()
      CoreLoader.loadStatus = true
    } catch (error) {
      logger.error(error)
    }
  }

  /**
   * @description ??????core
   */
  public dispose (): void {
    if (!CoreLoader.loadStatus) {
      logger.debug('core already disposed, ignore...')
      return
    }
    for (const uuid of Object.keys(this.MeoAsstPtr)) {
      this.Stop(uuid)
      this.Destroy(uuid)
    }
    for (const dep of this.DepLibs) {
      console.log(dep.path())
      dep.close()
    }
    this.DLib.close()
  }

  /**
   * ??????????????????
   * @param path? ???????????????libPath
   * @returns
   */
  public LoadResource (path?: string): Boolean {
    return this.MeoAsstLib.AsstLoadResource(path ?? this.libPath)
  }

  /**
   * ??????????????????, ???????????????
   * @returns ????????????{ref.Pointer}
   */
  public Create (): boolean {
    this.MeoAsstPtr.placeholder = this.MeoAsstLib.AsstCreate()
    return !!this.MeoAsstPtr.placeholder
  }

  /**
   * @description ????????????
   * @param uuid ?????????????????????
   * @param callback ????????????
   * @param customArg ???????????????{???}
   * @returns  ??????????????????
   */
  public CreateEx (
    uuid: string,
    callback: any = callbackHandle,
    customArg: any = createVoidPointer()
  ): boolean {
    if (!this.MeoAsstPtr[uuid]) {
      this.MeoAsstPtr[uuid] = this.MeoAsstLib.AsstCreateEx(callback, customArg)
      return true
    }
    return false // ????????????
  }

  /**
   * @description ????????????
   * @param uuid ?????????????????????
   */
  public Destroy (uuid: string): void {
    if (this.MeoAsstPtr[uuid]) {
      this.MeoAsstLib.AsstDestroy(this.MeoAsstPtr[uuid])
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this.MeoAsstPtr[uuid]
    }
  }

  /**
   * @description ??????
   * @param address ????????????
   * @param uuid ?????????????????????
   * @param adbPath adb??????
   * @param config ???????????????, ??????????????????'General'
   * @returns ??????????????????
   */
  public Connect (address: string, uuid: string, adbPath: string, config: string): boolean {
    return this.MeoAsstLib.AsstConnect(this.MeoAsstPtr[uuid], adbPath, address, config)
  }

  /**
   * ????????????
   * @param uuid ?????????????????????
   * @param type ????????????, ????????????
   * @param params ??????json?????????, ????????????
   * @returns
   */
  public AppendTask (uuid: string, type: string, params: string): number {
    return this.MeoAsstLib.AsstAppendTask(this.GetUUID(uuid), type, params)
  }

  /**
   * ??????????????????
   * @param uuid ?????????????????????
   * @param taskId ????????????id
   * @param params ????????????
   */

  public SetTaskParams (uuid: string, taskId: number, params: string): boolean {
    return this.MeoAsstLib.AsstSetTaskParams(
      this.GetUUID(uuid),
      taskId,
      params
    )
  }

  /**
   * ????????????
   * @param uuid ?????????????????????
   * @returns ????????????
   */
  public Start (uuid: string): boolean {
    return this.MeoAsstLib.AsstStart(this.GetUUID(uuid))
  }

  /**
   * ???????????????????????????
   * @param uuid ?????????????????????
   * @returns
   */
  public Stop (uuid: string): boolean {
    return this.MeoAsstLib.AsstStop(this.GetUUID(uuid))
  }

  /**
   * ????????????
   * @param uuid ?????????????????????
   * @param x x??????
   * @param y y??????
   * @param block ???????????????true???????????????????????????????????????false????????????
   * @returns
   */
  public CtrlerClick (uuid: string, x: number, y: number, block: boolean): boolean {
    return this.MeoAsstLib.AsstCtrlerClick(this.GetUUID(uuid), x, y, block)
  }

  public GetImage (uuid: string): string {
    logger.debug('enter GetImage')
    const buf = Buffer.alloc(5114514)
    logger.debug(`allocated size ${buf.length}`)
    const len = this.MeoAsstLib.AsstGetImage(this.GetUUID(uuid), buf as any, buf.length)
    const buf2 = buf.slice(0, len as number)
    logger.debug('received image len: ', len)
    const v2 = buf2.toString('base64')
    // logger.debug(v2)
    return v2
  }

  /**
   * @description core??????
   * @returns ??????
   */
  public GetVersion (): string | null {
    if (!this.loadStatus) return null
    return this.MeoAsstLib.AsstGetVersion()
  }

  public GetUUID (uuid: string): AsstInstancePtr {
    return this.MeoAsstPtr[uuid]
  }

  public Log (level: string, message: string): void {
    return this.MeoAsstLib.AsstLog(level, message)
  }
}

(new CoreLoader()).load()

export default CoreLoader
