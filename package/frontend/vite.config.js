import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import localDirectoryPicker from './localDirectoryPicker.js'

export default defineConfig({ base: './', plugins: [react(), localDirectoryPicker()] })
