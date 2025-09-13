import { ThemeProvider } from './app/providers/theme-provider'
import { QueryProvider } from './app/providers/query-provider'
import { AppRoutes } from './app/routes'

function App() {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AppRoutes />
      </QueryProvider>
    </ThemeProvider>
  )
}

export default App