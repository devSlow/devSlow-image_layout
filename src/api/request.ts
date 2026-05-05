import axios from 'axios'
import router from '@/router'

const request = axios.create({
  baseURL: 'https://paper.devslow.ccwu.cc',
  timeout: 300000
})

// 请求拦截：自动携带 JWT
request.interceptors.request.use(config => {
  const token = localStorage.getItem('pp_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

request.interceptors.response.use(
  (response) => {
    const data = response.data
    if (data.code !== 200) {
      return Promise.reject(new Error(data.message || '请求失败'))
    }
    return data
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('pp_token')
      router.push({ path: '/verify', query: { redirect: window.location.pathname } })
    }
    return Promise.reject(error)
  }
)

export default request
