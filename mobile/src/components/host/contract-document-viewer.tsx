import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Feather } from '@expo/vector-icons';
import { authColors as c, authRadius } from '@/components/auth/tokens';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import { useReducedMotionPreference } from '@/constants/motion';
import {
  buildContractHtmlDocument,
  extractContractToc,
  type ContractTocItem,
  type RentalContractRecord,
} from '@/services/rental-contracts';

const MIN_ZOOM = 85;
const MAX_ZOOM = 160;
const ZOOM_STEP = 15;

export function ContractDocumentViewer({
  contract,
  exportingPdf,
  onOpenToc,
  onExportPdf,
  jumpAnchor,
  jumpNonce,
}: {
  contract: RentalContractRecord;
  exportingPdf: boolean;
  onOpenToc: (items: ContractTocItem[]) => void;
  onExportPdf: () => void;
  jumpAnchor: string | null;
  jumpNonce: number;
}) {
  const reducedMotion = useReducedMotionPreference();
  const webViewRef = useRef<ComponentRef<typeof WebView> | null>(null);
  const [zoom, setZoom] = useState(100);
  const [loading, setLoading] = useState(true);
  const [renderError, setRenderError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const tocItems = useMemo(() => extractContractToc(contract), [contract]);
  const html = useMemo(
    () => buildContractHtmlDocument(contract, { fontScalePercent: zoom }),
    [contract, zoom]
  );

  // Jump to selected TOC anchor when requested
  useEffect(() => {
    if (!jumpAnchor || jumpNonce <= 0) return;
    const safeId = jumpAnchor.replace(/[^a-zA-Z0-9_-]/g, '');
    const behavior = reducedMotion ? 'auto' : 'smooth';
    webViewRef.current?.injectJavaScript(`
      (function() {
        var el = document.getElementById(${JSON.stringify(safeId)});
        if (el) el.scrollIntoView({ behavior: ${JSON.stringify(behavior)}, block: 'start' });
      })();
      true;
    `);
  }, [jumpAnchor, jumpNonce, reducedMotion]);

  return (
    <View style={s.container}>
      {/* Compact Document Toolbar: TOC | Zoom A- / % / A+ | PDF */}
      <View style={s.toolbar}>
        <AnimatedPressable
          scaleTo={0.97}
          accessibilityLabel="Mở mục lục điều khoản hợp đồng"
          style={s.tocBtn}
          onPress={() => onOpenToc(tocItems)}
        >
          <Feather name="list" size={15} color={c.primaryDark} />
          <Text style={s.tocBtnText}>Mục lục</Text>
        </AnimatedPressable>

        <View style={s.zoomGroup} accessibilityLabel={`Thu phóng văn bản ${zoom}%`}>
          <AnimatedPressable
            scaleTo={0.95}
            disabled={zoom <= MIN_ZOOM}
            accessibilityLabel="Thu nhỏ cỡ chữ hợp đồng"
            style={[s.zoomBtn, zoom <= MIN_ZOOM && { opacity: 0.4 }]}
            onPress={() => setZoom(z => Math.max(MIN_ZOOM, z - ZOOM_STEP))}
          >
            <Text style={s.zoomBtnText}>A-</Text>
          </AnimatedPressable>
          <Text style={s.zoomVal}>{zoom}%</Text>
          <AnimatedPressable
            scaleTo={0.95}
            disabled={zoom >= MAX_ZOOM}
            accessibilityLabel="Phóng to cỡ chữ hợp đồng"
            style={[s.zoomBtn, zoom >= MAX_ZOOM && { opacity: 0.4 }]}
            onPress={() => setZoom(z => Math.min(MAX_ZOOM, z + ZOOM_STEP))}
          >
            <Text style={s.zoomBtnText}>A+</Text>
          </AnimatedPressable>
        </View>

        <AnimatedPressable
          scaleTo={0.97}
          disabled={exportingPdf}
          accessibilityLabel="Tải hoặc chia sẻ bản PDF hợp đồng"
          style={[s.pdfBtn, exportingPdf && { opacity: 0.6 }]}
          onPress={onExportPdf}
        >
          {exportingPdf ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Feather name="download" size={14} color="#FFFFFF" />
          )}
          <Text style={s.pdfBtnText}>{exportingPdf ? 'Đang xuất…' : 'PDF'}</Text>
        </AnimatedPressable>
      </View>

      {/* Native WebView Document Viewport */}
      <View style={s.viewport}>
        {renderError ? (
          <View style={s.errorState}>
            <Feather name="alert-circle" size={24} color={c.error} />
            <Text style={s.errorTitle}>Không thể hiển thị tài liệu hợp đồng</Text>
            <Text style={s.errorDesc}>
              Đã xảy ra sự cố khi dựng nội dung văn bản gốc. Vui lòng thử tải lại.
            </Text>
            <AnimatedPressable
              scaleTo={0.97}
              style={s.retryBtn}
              onPress={() => {
                setRenderError(false);
                setLoading(true);
                setReloadKey(k => k + 1);
              }}
            >
              <Feather name="refresh-cw" size={14} color={c.primary} />
              <Text style={s.retryText}>Tải lại tài liệu</Text>
            </AnimatedPressable>
          </View>
        ) : (
          <>
            <WebView
              key={`${contract.id}:${reloadKey}`}
              ref={webViewRef}
              originWhitelist={['about:blank', 'data:*']}
              source={{ html, baseUrl: '' }}
              style={s.webview}
              javaScriptEnabled
              scalesPageToFit
              setBuiltInZoomControls={false}
              setDisplayZoomControls={false}
              showsVerticalScrollIndicator
              nestedScrollEnabled
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setRenderError(true);
              }}
              onRenderProcessGone={() => {
                setLoading(false);
                setRenderError(true);
              }}
              onShouldStartLoadWithRequest={(req: { url: string }) =>
                req.url === 'about:blank' || req.url === ''
              }
            />
            {loading && (
              <View style={s.loadingOverlay} pointerEvents="none">
                <ActivityIndicator size="small" color={c.primary} />
                <Text style={s.loadingText}>Đang hiển thị nguyên văn hợp đồng…</Text>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    gap: 10,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 2,
  },
  tocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: authRadius.round,
    backgroundColor: c.softMint,
    borderWidth: 1,
    borderColor: '#C5E3DB',
  },
  tocBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: c.primaryDark,
  },
  zoomGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: authRadius.round,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: 4,
    paddingVertical: 3,
    gap: 4,
  },
  zoomBtn: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: authRadius.round,
  },
  zoomBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: c.forestInk,
  },
  zoomVal: {
    minWidth: 38,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: c.textSecondary,
  },
  pdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: authRadius.round,
    backgroundColor: c.primary,
  },
  pdfBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  viewport: {
    flex: 1,
    minHeight: 360,
    backgroundColor: c.background,
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: c.background,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: c.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: c.textSecondary,
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 10,
  },
  errorTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: c.forestInk,
    textAlign: 'center',
  },
  errorDesc: {
    fontSize: 13,
    lineHeight: 19,
    color: c.textSecondary,
    textAlign: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: authRadius.md,
    backgroundColor: c.softMint,
    borderWidth: 1,
    borderColor: '#C5E3DB',
    marginTop: 4,
  },
  retryText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: c.primaryDark,
  },
});
