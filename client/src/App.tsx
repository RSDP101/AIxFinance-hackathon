import './index.css';
import { useMarketWebSocket } from './hooks/useMarketData';
import { useNewsFeed } from './hooks/useNewsFeed';
import TopBar from './components/TopBar';
import TradingPanel from './components/TradingPanel/TradingPanel';
import NewsDashboard from './components/NewsDashboard/NewsDashboard';
import NotificationToast from './components/NewsDashboard/NotificationToast';

function App() {
  useMarketWebSocket();
  useNewsFeed();

  return (
    <div className="h-screen flex flex-col bg-bg-primary text-text-primary">
      <TopBar />
      <div className="flex flex-1 min-h-0">
        {/* Trading Panel - 65% */}
        <div className="w-[65%] flex flex-col border-r border-border">
          <TradingPanel />
        </div>
        {/* News Dashboard - 35% */}
        <div className="w-[35%] flex flex-col">
          <NewsDashboard />
        </div>
      </div>
      <NotificationToast />
    </div>
  );
}

export default App;
