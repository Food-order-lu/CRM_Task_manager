import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
    plugins: [
        tailwindcss(),
    ],
    server: {
        host: '0.0.0.0',
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true
            }
        }
    },
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                dashboard: resolve(__dirname, 'dashboard.html'),
                crm: resolve(__dirname, 'crm.html'),
                projects: resolve(__dirname, 'projects.html'),
                tasks: resolve(__dirname, 'tasks.html'),
                visits: resolve(__dirname, 'visits.html'),
                directory: resolve(__dirname, 'directory.html'),
                projectTasks: resolve(__dirname, 'project-tasks.html'),
            }
        }
    }
})
