import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      // 设置登录状态
      setAuth: (token, user) => {
        set({
          token,
          user,
          isAuthenticated: true,
        });
      },

      // 更新用户信息
      updateUser: (user) => {
        set({ user });
      },

      // 登出
      logout: () => {
        set({
          token: null,
          user: null,
          isAuthenticated: false,
        });
      },

      // 获取 token
      getToken: () => get().token,
    }),
    {
      name: 'keep-fit-auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export { useAuthStore };
