<template>
  <q-page class="row items-start" style="min-height:0">
    <ChannelNavigation />
    <div style="flex:1; display:flex; flex-direction:column; min-height:0; padding:16px">
      <div class="page-content">
        <h2 class="text-white">Welcome</h2>
        <p class="text-grey-4">Select a channel on the left to get started.</p>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import ChannelNavigation from 'src/components/ChannelNavigation.vue'

</script>

<style scoped></style>
