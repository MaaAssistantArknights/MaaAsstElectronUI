import Window from '@main/window/factory'

type MessageType = 'info' | 'success' | 'warning' | 'error' | 'loading' | 'default'

export default {
  message: (message: string, type: MessageType) => new Window().get().webContents.send('ui:message', {
    message,
    type
  })
}
