import { useEffect, useRef } from 'react';

/**
 * Custom hook for showing real-time notifications
 * @param {boolean} enabled - Whether notifications are enabled
 * @returns {object} - Notification functions
 */
export const useRealtimeNotifications = (enabled = true) => {
  const notificationTimeouts = useRef(new Set());

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      notificationTimeouts.current.forEach(timeout => clearTimeout(timeout));
      notificationTimeouts.current.clear();
    };
  }, []);
  const showNotification = (type, message, duration = 3000) => {
    if (!enabled) return;

    const colors = {
      delete: 'bg-red-100 border-red-400 text-red-700',
      update: 'bg-blue-100 border-blue-400 text-blue-700',
      new: 'bg-green-100 border-green-400 text-green-700',
      error: 'bg-orange-100 border-orange-400 text-orange-700'
    };

    const icons = {
      delete: '🗑️',
      update: '✏️',
      new: '💬',
      error: '⚠️'
    };

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 ${colors[type] || colors.new} px-4 py-3 rounded shadow-lg z-50 transition-all duration-300 max-w-sm border`;
    
    // Create content structure
    const content = document.createElement('div');
    content.className = 'flex items-center gap-2';
    
    const icon = document.createElement('span');
    icon.textContent = icons[type] || icons.new;
    
    const text = document.createElement('span');
    text.textContent = message;
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'ml-2 text-sm opacity-60 hover:opacity-100';
    closeBtn.textContent = '✕';
    closeBtn.onclick = () => notification.remove();
    
    content.appendChild(icon);
    content.appendChild(text);
    content.appendChild(closeBtn);
    notification.appendChild(content);

    // Add to DOM
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
      notification.style.opacity = '1';
    }, 10);

    // Auto remove after duration
    const timeout = setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
      notificationTimeouts.current.delete(timeout);
    }, duration);

    notificationTimeouts.current.add(timeout);
  };

  const showDeleteNotification = (userName) => {
    showNotification('delete', `${userName} deleted a message`);
  };

  const showUpdateNotification = (userName) => {
    showNotification('update', `${userName} edited a message`);
  };

  const showNewMessageNotification = (userName) => {
    showNotification('new', `New message from ${userName}`);
  };

  const showErrorNotification = (errorMessage) => {
    showNotification('error', errorMessage, 5000);
  };

  return {
    showDeleteNotification,
    showUpdateNotification,
    showNewMessageNotification,
    showErrorNotification,
    showNotification
  };
};

/**
 * Custom hook for managing database connection status
 * @param {object} supabase - Supabase client
 * @returns {object} - Connection status and utilities
 */
export const useDbConnectionStatus = (supabase) => {
  const checkConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id')
        .limit(1);
      
      return !error;
    } catch (err) {
      return false;
    }
  };

  const testRealtimeConnection = () => {
    return new Promise((resolve) => {
      const testChannel = supabase.channel('connection-test');
      testChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          testChannel.unsubscribe();
          resolve(true);
        } else if (status === 'CHANNEL_ERROR') {
          testChannel.unsubscribe();
          resolve(false);
        }
      });
    });
  };

  return {
    checkConnection,
    testRealtimeConnection
  };
};
