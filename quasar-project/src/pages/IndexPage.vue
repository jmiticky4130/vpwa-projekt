<template>
  <q-page class="row items-start" style="min-height: 0; height: 100%">
    <div style="flex:1; display:flex; flex-direction:column; min-height:0; padding:16px">
      <div class="page-content">
        <h2 class="text-white">Welcome</h2>
        <p class="text-grey-4">Select a channel on the left to get started or use /join #channel to join or create one.</p>
      </div>
    </div>
    <div class="absolute-bottom full-width">
    <ChannelTextField/>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import ChannelTextField from 'src/components/ChannelTextField.vue'
</script>

<style scoped></style>
