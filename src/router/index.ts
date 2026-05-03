import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'landing',
      component: () => import('@/views/LandingView.vue')
    },
    {
      path: '/upload',
      name: 'upload',
      component: () => import('@/views/UploadView.vue')
    },
    {
      path: '/editor/:paperId',
      name: 'editor',
      component: () => import('@/views/EditorView.vue')
    },
    {
      path: '/quick',
      name: 'quick',
      component: () => import('@/views/QuickRewriteView.vue')
    },
    {
      path: '/quick',
      name: 'quick-rewrite',
      component: () => import('@/views/QuickRewriteView.vue')
    }
  ]
})

export default router
