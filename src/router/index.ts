import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'upload',
      component: () => import('@/views/UploadView.vue')
    },
    {
      path: '/editor/:paperId',
      name: 'editor',
      component: () => import('@/views/EditorView.vue')
    }
  ]
})

export default router
