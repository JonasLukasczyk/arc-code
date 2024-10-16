<script setup>
import SwateView from './components/SwateView.vue'
</script>

<template>
  <q-layout view="hHh LpR fFf">
    <q-page-container class='full'>
      <SwateView/>
    </q-page-container>
  </q-layout>
</template>

<style>
.full{
  position:absolute;
  top:0;
  left:0;
  bottom:0;
  right:0;
}
</style>
