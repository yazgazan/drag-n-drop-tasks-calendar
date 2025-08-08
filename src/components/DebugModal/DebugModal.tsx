import React, { useState, useEffect } from 'react';
import { debugLogger } from '../../utils/debugLogger';

interface DebugModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DebugModal: React.FC<DebugModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState(debugLogger.getLogs());
  const [filter, setFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    if (isOpen) {
      // Refresh logs when modal opens
      setLogs(debugLogger.getLogs());
    }
  }, [isOpen]);

  const filteredLogs = logs.filter(log => {
    const levelMatch = filter === 'all' || log.level === filter;
    const categoryMatch = categoryFilter === 'all' || log.category === categoryFilter;
    return levelMatch && categoryMatch;
  });

  const categories = Array.from(new Set(logs.map(log => log.category)));

  const copyLogsToClipboard = () => {
    const logsText = debugLogger.exportLogs();
    navigator.clipboard.writeText(logsText).then(() => {
      alert('Logs copied to clipboard!');
    }).catch(() => {
      // Fallback for mobile browsers
      const textArea = document.createElement('textarea');
      textArea.value = logsText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Logs copied to clipboard!');
    });
  };

  const clearLogs = () => {
    debugLogger.clearLogs();
    setLogs([]);
  };

  if (!isOpen) return null;

  return (
    <div className={`modal-overlay ${isOpen ? 'active' : ''}`} onClick={onClose}>
      <div className="modal debug-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Debug Logs ({filteredLogs.length})</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="debug-controls">
          <div className="debug-filters">
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value as 'all' | 'info' | 'warn' | 'error')}
              className="debug-filter"
            >
              <option value="all">All Levels</option>
              <option value="info">Info</option>
              <option value="warn">Warn</option>
              <option value="error">Error</option>
            </select>
            
            <select 
              value={categoryFilter} 
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="debug-filter"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          
          <div className="debug-actions">
            <button onClick={() => setLogs(debugLogger.getLogs())} className="refresh-button">
              Refresh
            </button>
            <button onClick={copyLogsToClipboard} className="copy-button">
              Copy Logs
            </button>
            <button onClick={clearLogs} className="clear-button">
              Clear Logs
            </button>
          </div>
        </div>

        <div className="debug-logs-container">
          {filteredLogs.length === 0 ? (
            <div className="no-logs">No logs to display</div>
          ) : (
            filteredLogs.map((log, index) => (
              <div key={index} className={`debug-log-entry log-${log.level}`}>
                <div className="log-header">
                  <span className="log-timestamp">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  <span className={`log-level log-level-${log.level}`}>{log.level.toUpperCase()}</span>
                  <span className="log-category">[{log.category}]</span>
                </div>
                <div className="log-message">{log.message}</div>
                {log.data && (
                  <div className="log-data">
                    <pre>{JSON.stringify(log.data, null, 2)}</pre>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DebugModal;