// import { ipcMain } from 'electron'
// import DeviceDetector from '@main/deviceDetector'
// import { $ } from '@main/utils/shell'
// import logger from '@main/utils/logger'
import DeviceDetector from '@main/deviceDetector'
import logger from '@main/utils/logger'

export default function useEmulatorHooks (): void {
  logger.debug((new DeviceDetector()).name)
  // ipcMain.handle('asst:getEmulators', async (event): Promise<Emulator[]> => {
  //   return await (new DeviceDetector()).getEmulators()
  // })
  // ipcMain.handle(
  //   'asst:getDeviceUuid',
  //   async (event, arg): Promise<string | boolean> => {
  //     // const ret = getDeviceUuid(arg.address, arg.adb_path)
  //     const ret = await getDeviceUuid()
  //     console.log(ret)
  //     return ret
  //   }
  // )

  // ipcMain.handle('asst:startEmulator', async (event, arg: string) => {
  //   logger.debug(`Try start emulator on ${arg}`)
  //   const ret = await $`${arg}`
  //   logger.debug(`Start Emulator stdout: ${(ret).stdout}`)
  //   logger.debug(`Start Emulator stderr: ${(ret).stderr}`)
  // })
}
