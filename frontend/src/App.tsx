import { ThemeToggle } from './components/ThemeToggle';

function App() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Real-Time Chess
            </h1>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-center text-gray-600 dark:text-gray-400">
          Frontend setup complete
        </p>
      </main>
    </div>
  );
}

export default App;

