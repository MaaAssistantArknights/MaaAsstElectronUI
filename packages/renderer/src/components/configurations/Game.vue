<script setup lang="ts">
import {
  NCheckbox,
  NForm,
  NFormItem,
  NSelect
} from 'naive-ui'
import _ from 'lodash'

interface GameConfiguration {
  client_type: string; // 服务器
  start_game_enable: boolean; // 是否自动启动客户端
}

const serverOptions = [
  {
    value: 'Official',
    label: 'Official'
  },
  {
    value: 'Bilibili',
    label: 'Bilibili'
  }
]

const props = defineProps<{
  configurations: GameConfiguration;
}>()
</script>
<template>
  <NForm
    class="configuration-form"
    size="small"
    :show-feedback="false"
    :label-align="'left'"
    :label-placement="'left'"
    :label-width="'auto'"
  >
    <NFormItem label="客户端类型" :show-label="true">
      <NSelect
        :value="props.configurations.client_type"
        @update:value="(value) => _.set(props.configurations, 'client_type', value)"
        :options="serverOptions"
      />
    </NFormItem>
    <NFormItem>
    <NCheckbox
          :checked="props.configurations.start_game_enable"
          @update:checked="
            (checked) =>
              _.set(props.configurations, 'start_game_enable', checked)
          "
        >自动启动客户端</NCheckbox>
        </NFormItem>

  </NForm>
</template>
