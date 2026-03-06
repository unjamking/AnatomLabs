/**
 * BioDigitalWebView - WebView-based 3D anatomy viewer
 *
 * Uses Zygote Body's web viewer for interactive 3D anatomy models.
 * Optimized for mobile with proper zoom and smooth interactions.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from './animations/config';

export interface BioDigitalWebViewProps {
  style?: any;
  onLoad?: () => void;
  onError?: (error: string) => void;
}

const BioDigitalWebView: React.FC<BioDigitalWebViewProps> = ({
  style,
  onLoad,
  onError,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const webViewRef = useRef<WebView>(null);

  // Custom HTML with embedded Zygote Body viewer - optimized zoom and UI
  const getHtmlContent = () => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          user-select: none;
        }

        html, body {
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: #0a0a0a;
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
        }

        .container {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          background: #0a0a0a;
        }

        .viewer-wrapper {
          flex: 1;
          position: relative;
          overflow: hidden;
          border-radius: 0;
        }

        iframe {
          position: absolute;
          top: -60px;
          left: -10px;
          right: -10px;
          bottom: -80px;
          width: calc(100% + 20px);
          height: calc(100% + 140px);
          border: none;
          background: #0a0a0a;
          transform: scale(0.95);
          transform-origin: center center;
        }

        .controls-hint {
          position: absolute;
          bottom: 16px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(26, 26, 26, 0.95);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          padding: 10px 20px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          z-index: 100;
          border: 1px solid rgba(255,255,255,0.1);
        }

        .hint-item {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #888;
          font-size: 12px;
          font-weight: 500;
        }

        .hint-icon {
          font-size: 14px;
        }

        .loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: #0a0a0a;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          z-index: 200;
          transition: opacity 0.3s ease;
        }

        .loading-overlay.hidden {
          opacity: 0;
          pointer-events: none;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(231, 76, 60, 0.2);
          border-top-color: #e74c3c;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .loading-text {
          color: #888;
          font-size: 14px;
          margin-top: 16px;
        }

        .loading-subtitle {
          color: #555;
          font-size: 12px;
          margin-top: 8px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="viewer-wrapper">
          <iframe
            id="zygote-frame"
            src="https://www.zygotebody.com/#nav=0,0,100"
            allow="autoplay; fullscreen"
            allowfullscreen
            onload="hideLoading()"
          ></iframe>

          <div class="loading-overlay" id="loading">
            <div class="spinner"></div>
            <div class="loading-text">Loading 3D Anatomy</div>
            <div class="loading-subtitle">This may take a moment...</div>
          </div>

          <div class="controls-hint">
            <div class="hint-item">
              <span class="hint-icon">👆</span>
              <span>Drag to rotate</span>
            </div>
            <div class="hint-item">
              <span class="hint-icon">🤏</span>
              <span>Pinch to zoom</span>
            </div>
          </div>
        </div>
      </div>

      <script>
        function hideLoading() {
          setTimeout(function() {
            document.getElementById('loading').classList.add('hidden');
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'loaded' }));
          }, 1500);
        }

        // Hide loading after timeout even if iframe doesn't trigger onload
        setTimeout(function() {
          document.getElementById('loading').classList.add('hidden');
        }, 8000);
      </script>
    </body>
    </html>
  `;

  const handleLoad = useCallback(() => {
    // WebView loaded, but iframe might still be loading
  }, []);

  const handleMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'loaded') {
        setLoading(false);
        onLoad?.();
      }
    } catch (e) {
      // Ignore non-JSON messages
    }
  }, [onLoad]);

  const handleError = useCallback((syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    const errorMessage = nativeEvent.description || 'Failed to load 3D viewer';
    setLoading(false);
    setError(errorMessage);
    onError?.(errorMessage);
  }, [onError]);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    webViewRef.current?.reload();
  };

  if (error) {
    return (
      <View style={[styles.container, styles.errorContainer, style]}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.primary} />
        <Text style={styles.errorTitle}>Failed to Load</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        source={{ html: getHtmlContent() }}
        style={styles.webView}
        onLoad={handleLoad}
        onError={handleError}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        scalesPageToFit={false}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        contentMode="mobile"
        automaticallyAdjustContentInsets={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  webView: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BioDigitalWebView;
