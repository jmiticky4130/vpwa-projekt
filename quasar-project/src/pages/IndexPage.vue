<template>
  <q-page class="row items-start" style="min-height:100vh">
    <div class="q-pa-md bg-grey-2" style="width:260px">
      <div class="text-h6 q-mb-md">Channels</div>
      <div class="text-subtitle2 text-grey-6">(Channel navigation appears here)</div>
    </div>

    <div style="flex:1; display:flex; flex-direction:column; min-height:100vh">
      <MessageFeed />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import MessageFeed from 'src/components/MessageFeed.vue'

</script>

<style scoped></style>
