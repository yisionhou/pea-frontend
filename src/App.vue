<script setup lang="ts">
import en from 'element-plus/es/locale/lang/en'
</script>
<template>
  <el-config-provider :locale="en" size="large"><router-view /></el-config-provider>
</template>
