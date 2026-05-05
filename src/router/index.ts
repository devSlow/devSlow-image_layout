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
      path: '/verify',
      name: 'verify',
      component: () => import('@/views/VerifyView.vue')
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
      path: '/ppt',
      name: 'ppt',
      component: () => import('@/views/PptGenerateView.vue')
    }
  ]
})

// 路由守卫：未登录跳转到验证页
const whiteList = ['/verify', '/']
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('pp_token')
  if (!token && !whiteList.includes(to.path)) {
    next({ path: '/verify', query: { redirect: to.fullPath } })
  } else {
    next()
  }
})

export default router
